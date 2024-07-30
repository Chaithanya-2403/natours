import axios from 'axios';
import { showAlert } from './alert';

export const submitReview = async (review, rating, user, tour) => {
  console.log('Submitting review:', review, rating, user, tour);
  try {
    const res = await axios({
      method: 'POST',
      url: `/api/v1/tours/${tour}/reviews`,
      data: {
        review,
        rating,
        user,
        tour,
      },
    });
    if (res.data.status === 'success') {
      showAlert('success', 'review add successfully');
      window.setTimeout(() => {
        location.reload(true);
      }, 1000);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
