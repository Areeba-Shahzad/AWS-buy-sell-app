import React, { useState } from 'react';
import { CognitoUser } from 'amazon-cognito-identity-js';
import UserPool from '../UserPool'; // Your UserPool configuration
import { useNavigate } from 'react-router-dom'; // Import useNavigate hook
import '../styles.css'; // Import the CSS file

const ConfirmSignup = () => {
  const [email, setEmail] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate(); // Initialize navigate function

  const handleConfirmSignup = (e) => {
    e.preventDefault();
    setIsLoading(true);
  
    if (!confirmationCode) {
      setMessage('Please enter the confirmation code sent to your email.');
      setIsLoading(false);
      
      // Redirect anyway
      setTimeout(() => {
        navigate('/login');
      }, 1500);
      
      return;
    }
  
    const userData = {
      Username: email,
      Pool: UserPool,
    };
  
    const cognitoUser = new CognitoUser(userData);
  
    cognitoUser.confirmRegistration(confirmationCode, true, (err, result) => {
      if (err) {
        console.error("Error confirming registration:", err);
        // setMessage(`Error: ${err.message}`);
        // setMessage("Account confirmed successfully!");
      } else {
        console.log("Confirmation successful:", result);
        setMessage("Account confirmed successfully!");
      }
  
      setIsLoading(false);
  
      // Redirect to login regardless of success or error
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    });
  };
  

  return (
    <div className="container">
      <form onSubmit={handleConfirmSignup}>
        <h2>Confirm your account</h2>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          className="input-field"
        />

        <input
          type="text"
          value={confirmationCode}
          onChange={(e) => setConfirmationCode(e.target.value)}
          placeholder="Enter confirmation code"
          required
          className="input-field"
        />

        <button
          type="submit"
          disabled={isLoading}
          className="submit-button"
        >
          {isLoading ? 'Verifying...' : 'Verify Account'}
        </button>

        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
};

export default ConfirmSignup;