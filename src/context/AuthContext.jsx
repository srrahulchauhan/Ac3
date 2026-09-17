import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Require passcode verification on app open / session start
    const isSessionAuth = sessionStorage.getItem('account_session_authenticated');
    const storedUser = sessionStorage.getItem('account_mock_user') || localStorage.getItem('account_mock_user');
    
    if (isSessionAuth === 'true' && storedUser) {
      const parsed = JSON.parse(storedUser);
      setCurrentUser({ uid: parsed.uid, email: parsed.email });
      setUserData(parsed);
    } else {
      localStorage.removeItem('account_mock_user');
      sessionStorage.removeItem('account_mock_user');
      sessionStorage.removeItem('account_session_authenticated');
      setCurrentUser(null);
      setUserData(null);
    }
    setLoading(false);
  }, []);

  const persistUser = (user) => {
    sessionStorage.setItem('account_session_authenticated', 'true');
    sessionStorage.setItem('account_mock_user', JSON.stringify(user));
    localStorage.setItem('account_mock_user', JSON.stringify(user));
    setCurrentUser({ uid: user.uid, email: user.email });
    setUserData(user);
  };

  const register = async (email, password, firstName, lastName, phone) => {
    const user = {
      uid: Date.now().toString(),
      firstName,
      lastName,
      email,
      phone,
      role: 'user',
      customCategories: [],
      customPaymentApps: [],
      appLogo: '',
      dismissedNotifications: [],
      lastAutoSave: null,
      createdAt: new Date().toISOString()
    };
    persistUser(user);
    return { user: { uid: user.uid } };
  };

  const verifyPasscode = async (passcode) => {
    if (passcode === '20002') {
      const user = {
        uid: 'r_accountant_owner',
        firstName: 'Account',
        lastName: 'Admin',
        email: 'admin@raccountant.com',
        phone: '',
        role: 'Owner / Admin',
        passcodeAuth: true,
        createdAt: new Date().toISOString()
      };
      persistUser(user);
      return true;
    }
    return false;
  };

  const login = async (email, password) => {
    return verifyPasscode('20002');
  };


  const loginWithGoogle = async () => {
    const user = {
      uid: Date.now().toString(),
      firstName: "Google",
      lastName: "User",
      email: "google@example.com",
      phone: "",
      profilePic: "",
      customCategories: [],
      customPaymentApps: [],
      appLogo: '',
      dismissedNotifications: [],
      lastAutoSave: null,
      role: 'user',
      createdAt: new Date().toISOString()
    };
    persistUser(user);
  };

  const logout = async () => {
    sessionStorage.removeItem('account_session_authenticated');
    sessionStorage.removeItem('account_mock_user');
    localStorage.removeItem('account_mock_user');
    setCurrentUser(null);
    setUserData(null);
  };

  const resetPassword = async (email) => {
    // mock
    return true;
  };

  const updatePassword = async (newPassword) => {
    // mock
    return true;
  };

  const updateUserData = async (data) => {
    if (!userData) return;
    const updated = { ...userData, ...data };
    persistUser(updated);
  };

  const value = {
    currentUser,
    userData,
    verifyPasscode,
    register,
    login,

    loginWithGoogle,
    logout,
    resetPassword,
    updatePassword,
    updateUserData,
    customCategories: userData?.customCategories || [],
    customPaymentApps: userData?.customPaymentApps || [],
    appLogo: userData?.appLogo || '',
    dismissedNotifications: userData?.dismissedNotifications || [],
    lastAutoSave: userData?.lastAutoSave || null
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
