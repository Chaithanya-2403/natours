import axios from 'axios';
import { showAlert } from './alert';
const stripe = Stripe(
  'pk_test_51Hf76LHLoK8FyKnZbMnA5swQgV1HIRgrmMaG8i2R13j3hriNo4eUDoXuUOkfB70sc1hZEfJPJf2HG277Grs5GJlv00DevRshXz',
);

export const bookTour = async (tourId) => {
  try {
  } catch (err) {
    console.log(err.message);
    showAlert('error', err);
  }
  // 1. Get Checkout session
  const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
  console.log(session);

  // 2. Create Checkout form + charge credit card
  await stripe.redirectToCheckout({
    sessionId: session.data.session.id,
  });
};
