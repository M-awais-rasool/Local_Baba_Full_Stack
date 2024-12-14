import axios from 'axios';
import {API, getToken} from '../api/api';

async function add_to_cart(id: string) {
  const res = await API.post(`/user/Cart/add-to-cart/${id}`);
  return res.data;
}

async function add_to_address(data: any) {
  const res = await API.post(`/user/Address/add-address`, data);
  return res.data;
}

async function add_quantity(id: string) {
  const res = await API.put(`/user/Cart/add-quantity/${id}`);
  return res.data;
}

async function remove_quantity(id: string) {
  const res = await API.put(`/user/Cart/remove-quantity/${id}`);
  return res.data;
}

async function upload_image(formData: any) {
  const token = getToken();
  const res = await axios.put(
    'http://192.168.100.109:8080/user/upload-image',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return res.data;
}

async function upload_rider_image(formData: any) {
  const token = getToken();
  const res = await axios.put(
    'http://192.168.100.109:8080/rider/upload-image',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return res.data;
}
async function place_order_By_Cart(data: {
  quantity: number;
  latLong: string;
  isDefaultAddress: boolean;
}) {
  const res = await API.post(`/user/Order/add-order-by-cart`, data);
  return res.data;
}

async function place_order_By_product(
  id: string,
  data: {quantity: number; latLong: string; isDefaultAddress: boolean},
) {
  console.log(id);
  console.log(data);
  const res = await API.post(`/user/Order/add-order-by-product${id}`, data);
  return res.data;
}

async function Order_cancel(id: any) {
  let data = {
    Id: id,
  };
  const res = await API.put('/user/Order/order-cancel', data);
  return res.data;
}

async function Add_FCM(data: any) {
  const res = await API.post(`Save-FCM-Token`, data);
  return res.data.data;
}

async function order_assigned(data: any) {
  const res = await API.put(`/rider/Order/assigned-orders`, data);
  return res.data;
}

async function picked_order(data: any) {
  const res = await API.put(`/rider/Order/Picked-order`, data);
  return res.data;
}

async function Deliverd_order(data: any) {
  const res = await API.put(`/rider/Order/Deliverd-order`, data);
  return res.data;
}

export {
  upload_rider_image,
  Deliverd_order,
  add_to_cart,
  add_to_address,
  remove_quantity,
  add_quantity,
  upload_image,
  place_order_By_product,
  place_order_By_Cart,
  Order_cancel,
  Add_FCM,
  order_assigned,
  picked_order,
};
