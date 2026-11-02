'use strict';

/* Firebase web configuration for the 1438th Engineer Hub project. */
const firebaseConfig = {
  apiKey: 'AIzaSyBM5Ncpe5k7RN20ezSf4FRFr4FbDUpi2Fw',
  authDomain: 'engineer-hub-1438.firebaseapp.com',
  projectId: 'engineer-hub-1438',
  storageBucket: 'engineer-hub-1438.firebasestorage.app',
  messagingSenderId: '695246582975',
  appId: '1:695246582975:web:a2cde69840f59f126dc20a',
  measurementId: 'G-SH6X47ZD5B'
};

firebase.initializeApp(firebaseConfig);
window.firebaseHub = {
  auth: firebase.auth(),
  db: firebase.firestore(),
  projectId: firebaseConfig.projectId
};
