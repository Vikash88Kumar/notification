// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
const firebaseConfig = {
  apiKey: "AIzaSyCXKGuwKX3zHQ9VslvrTNESCPAFON12lYA",
  authDomain: "notification-service-ed93d.firebaseapp.com",
  projectId: "notification-service-ed93d",
  storageBucket: "notification-service-ed93d.firebasestorage.app",
  messagingSenderId: "351765879932",
  appId: "1:351765879932:web:d474b0c86e13f855ccfdf9",
  measurementId: "G-2MPEQH3TTK"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();