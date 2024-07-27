import axios from 'axios';
import { showAlert } from './alert';

// type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
  const url = type === 'password' ? '/api/v1/users/updateMyPassword' : '/api/v1/users/updateMe';
  try {
    const res = await axios({
      method: 'PATCH',
      url,
      data,
    });
    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} User data updated successfully`);
      // window.setTimeout(() => {
      //   location.assign('/');
      // }, 1000);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
