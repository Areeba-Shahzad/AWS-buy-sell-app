import React, { useState, useEffect } from 'react';
import { CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import UserPool from '../UserPool';
import { useNavigate } from 'react-router-dom';
import '../styles.css'; // Import the CSS file

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [cognitoUser, setCognitoUser] = useState(null);
  const [message, setMessage] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const adminEmails = ['admin@example.com']; // Update as needed
  const adminApiEndpoint = "https://8vancw13hh.execute-api.us-east-1.amazonaws.com/api/confirm-user"; // Replace with your API endpoint

  useEffect(() => {
    const pendingUser = localStorage.getItem('pendingConfirmation');
    if (pendingUser) {
      setEmail(pendingUser);
      setMessage('Please log in with your credentials.');
      localStorage.removeItem('pendingConfirmation');
    }
  }, []);

  const saveSession = (session) => {
    const idToken = session.getIdToken().getJwtToken();
    localStorage.setItem('token', idToken);
  };

  const fetchAndRedirectUser = (user) => {
    user.getUserAttributes((err, attributes) => {
      if (err) {
        console.error('Error fetching attributes:', err);
        navigate('/products');
        return;
      }

      const attrMap = {};
      attributes.forEach(attr => {
        attrMap[attr.getName()] = attr.getValue();
      });

      localStorage.setItem('user', JSON.stringify(attrMap)); // Still saving locally

      const userRole = attrMap['custom:role'];
      const userID = attrMap['sub'];
      const token = localStorage.getItem('token'); // Already saved earlier

      if (adminEmails.includes(email.toLowerCase())) {
        console.log(userID);

        navigate('/admin', { state: { token, userRole, userID } });
      } else if (userRole === 'seller') {
        console.log(userID);
        navigate('/products', { state: { token, userRole, userID } });
      } else if (userRole === 'buyer') {
        // console.log(token);
        // console.log('user',userRole);
        console.log(userID);

        navigate('/products', { state: { token, userRole, userID } });
      } else {
        console.log(userID);

        navigate('/products', { state: { token, userRole, userID } });
      }
    });
  };

  const confirmUser = async (username) => {
    setIsConfirming(true);
    try {
      const userPoolId = process.env.REACT_APP_USER_POOL_ID || 'us-east-1_IPqipLOoX';
      
      const response = await fetch(adminApiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, userPoolId: userPoolId })
      });

      const data = await response.json();
      if (response.ok) {
        console.log('User confirmed successfully');
        setMessage('Your account has been confirmed. Please log in again.');
        return true;
      } else {
        console.error('Failed to confirm user:', data);
        setMessage(`Error confirming account: ${data.message || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error('Error calling confirm API:', error);
      setMessage('Network error while confirming account. Please try again.');
      return false;
    } finally {
      setIsConfirming(false);
    }
  };

  const handleLogin = (e) => {
    alert("Trying to log in")
    e.preventDefault();
    setMessage('');

    const authDetails = new AuthenticationDetails({ Username: email, Password: password });
    const user = new CognitoUser({ Username: email, Pool: UserPool });

    setCognitoUser(user);

    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        console.log('Login success');
        saveSession(session);
        fetchAndRedirectUser(user);
      },

      onFailure: async (err) => {
        console.error('Login failed:', err);

        if (err.code === 'UserNotConfirmedException') {
          setMessage('Account not confirmed. Attempting automatic confirmation...');
          
          const confirmed = await confirmUser(email);
          if (confirmed) {
            setTimeout(() => {
              setMessage('Please log in again with your credentials.');
            }, 1500);
          }
        } else {
          setMessage(err.message || JSON.stringify(err));
        }
      },

      newPasswordRequired: (userAttributes, requiredAttributes) => {
        console.log('New password required for:', email);
        setChallenge('NEW_PASSWORD_REQUIRED');
      },
    });
  };

  const handleNewPassword = (e) => {
    e.preventDefault();
    if (!cognitoUser) return;

    cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess: (session) => {
        console.log('Password changed and user confirmed');
        saveSession(session);
        fetchAndRedirectUser(cognitoUser);
      },
      onFailure: (err) => {
        console.error('Failed to set new password:', err);
        setMessage(err.message || JSON.stringify(err));
      },
    });
  };

  return (
    <div className="container">
      {!challenge ? (
        <form onSubmit={handleLogin}>
          <h2>Login</h2>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-field"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-field"
          />

          <button 
            type="submit"
            disabled={isConfirming}
            className="submit-button"
          >
            {isConfirming ? 'Confirming...' : 'Log In'}
          </button>

          {message && <p className="message">{message}</p>}

          <p>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="link-button"
            >
              Sign Up
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleNewPassword} className="new-password-form">
          <h2>Set New Password</h2>
          <p>You need to set a new password to complete your account setup.</p>

          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="input-field"
          />

          <button type="submit" className="submit-button">Set New Password</button>

          {message && <p className="message">{message}</p>}
        </form>
      )}
    </div>
  );
};

export default Login;