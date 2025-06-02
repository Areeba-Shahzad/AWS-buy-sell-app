import React, { useState } from 'react';
import { CognitoUserAttribute } from 'amazon-cognito-identity-js';
import UserPool from '../UserPool';
import { useNavigate } from 'react-router-dom';
import '../styles.css'; // Import the CSS file

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('buyer');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = (e) => {
    e.preventDefault();
    setIsLoading(true);

    const attributeList = [
      new CognitoUserAttribute({
        Name: 'custom:role',
        Value: role,
      }),
      new CognitoUserAttribute({
        Name: 'email',
        Value: email,
      })
    ];

    UserPool.signUp(email, password, attributeList, null, (err, data) => {
      if (err) {
        console.error("Signup Error:", err);
        setMessage(`Signup failed: ${err.message}`);
        setIsLoading(false);
      } else {
        console.log("Signup Success:", data);

        setMessage("Account created! Redirecting to login...");
        localStorage.setItem('pendingConfirmation', email);
        setIsLoading(false);

        setTimeout(() => {
          navigate('/confirmation');
        }, 2000);
      }
    });
  };

  return (
    <div className="container">
      <form onSubmit={handleSignup}>
        <h2>Sign Up</h2>

        <select 
          value={role} 
          onChange={(e) => setRole(e.target.value)} 
          required
          className="input-field"
        >
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
        </select>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="input-field"
        />
        
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="input-field"
        />

        <button 
          type="submit"
          disabled={isLoading}
          className="submit-button"
        >
          {isLoading ? 'Processing...' : 'Sign Up'}
        </button>
        
        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
};

export default Signup;