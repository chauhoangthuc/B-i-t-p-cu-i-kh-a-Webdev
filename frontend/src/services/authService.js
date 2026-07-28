import { gotrue } from './api.js';

export const authService = {
  async login(email, password) {
    const { data, error } = await gotrue.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async register(email, password, name) {
    const { data, error } = await gotrue.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name
        }
      }
    });
    if (error) throw error;
    return data;
  },

  async resetPassword(email) {
    const { data, error } = await gotrue.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await gotrue.signOut();
    if (error) throw error;
  },

  async getCurrentSession() {
    const { data, error } = await gotrue.getSession();
    if (error) throw error;
    return data.session;
  }
};
export default authService;
