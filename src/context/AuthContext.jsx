import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithPhoneNumber, 
  RecaptchaVerifier, 
  sendPasswordResetEmail, 
  updatePassword as firebaseUpdatePassword, 
  updateProfile as firebaseUpdateProfile, 
  signOut 
} from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [confirmationResult, setConfirmationResult] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setSession(user ? { user } : null);
      if (user) {
        setProfile({
          id: user.uid,
          full_name: user.displayName || 'User',
          email: user.email || '',
          phone: user.phoneNumber || '',
          avatar_url: user.photoURL || '',
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async (email, password, fullName) => {
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await firebaseUpdateProfile(userCredential.user, { displayName: fullName });
      return { user: userCredential.user };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { user: userCredential.user };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      return { user: userCredential.user };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
  };

  const sendPhoneOtp = async (phone) => {
    setAuthError(null);
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmationResult(result);
      return result;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const verifyPhoneOtp = async (phone, token) => {
    setAuthError(null);
    try {
      if (!confirmationResult) throw new Error('No OTP request found. Please send OTP first.');
      const result = await confirmationResult.confirm(token);
      return { user: result.user };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      return { message: 'Password reset email sent' };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const updatePassword = async (newPassword) => {
    setAuthError(null);
    try {
      if (currentUser) {
        await firebaseUpdatePassword(currentUser, newPassword);
      }
      return { message: 'Password updated' };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const updateProfile = async (updates) => {
    setAuthError(null);
    try {
      if (currentUser) {
        await firebaseUpdateProfile(currentUser, {
          displayName: updates.full_name || updates.displayName,
          photoURL: updates.avatar_url || updates.photoURL
        });
        setProfile((prev) => ({ ...prev, ...updates }));
      }
      return { message: 'Profile updated' };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const displayName = profile?.full_name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || currentUser?.photoURL || '';

  const legacyUserData = {
    uid: currentUser?.uid || 'guest',
    firstName: displayName.split(' ')[0] || 'User',
    lastName: displayName.split(' ').slice(1).join(' ') || '',
    full_name: displayName,
    email: profile?.email || currentUser?.email || '',
    phone: profile?.phone || currentUser?.phoneNumber || '',
    avatar_url: avatarUrl,
    profilePic: avatarUrl,
    role: 'Member',
  };

  const value = {
    currentUser,
    session,
    profile,
    loading,
    authError,
    setAuthError,
    isConfigured: true,
    register,
    login,
    loginWithGoogle,
    sendPhoneOtp,
    verifyPhoneOtp,
    resetPassword,
    updatePassword,
    updateProfile,
    logout,
    userData: legacyUserData,
    verifyPasscode: async () => true,
    updateUserData: updateProfile,
    customCategories: [],
    customPaymentApps: [],
    appLogo: '',
    dismissedNotifications: [],
    lastAutoSave: null,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
            <span className="visually-hidden">Loading authentication...</span>
          </div>
          <p className="text-muted fw-semibold small">Initializing Firebase session...</p>
        </div>
      )}
    </AuthContext.Provider>
  );
};
