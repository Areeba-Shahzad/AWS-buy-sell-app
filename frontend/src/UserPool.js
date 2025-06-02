// src/UserPool.js
import { CognitoUserPool } from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: 'us-east-1_IPqipLOoX',  // New pool ID you gave
  ClientId: '6vaubjihj0o9lc4d1h20fs1bi4',  // New client ID
};

export default new CognitoUserPool(poolData);