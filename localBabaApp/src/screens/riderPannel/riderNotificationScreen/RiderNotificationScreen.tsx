import {View, Text} from 'react-native';
import React, {useEffect, useState} from 'react';
import styles from './styles';
import {useQuery} from '@tanstack/react-query';
import {isNetworkAvailable} from '../../../api';
import {useToast} from 'react-native-toasty-toast';
import {get_notification} from '../../../services';
import {fetchAddress} from '../../../hooks/Hooks';
import { useIsFocused } from '@react-navigation/native';

const RiderNotificationScreen = () => {
  const {showToast} = useToast();
  const [deliveryItems, setDeliveryItems] = useState<any[]>([]);
  const isFocused = useIsFocused();

  const {data} = useQuery({
    queryKey: ['notification'],
    queryFn: async () => {
      try {
        const isConnected = await isNetworkAvailable();
        if (!isConnected) {
          showToast('Check your internet!', 'error', 'bottom', 1000);
          return;
        }
        const res = await get_notification();
        if (res.status == 'success') {
          console.log(res.data);
          return res.data;
        } else {
          return null;
        }
      } catch (err: any) {
        console.log(err.response.data.message);
        showToast(err.response.data.message, 'error', 'bottom', 1000);
      }
    },
    enabled: isFocused,
  });

  useEffect(() => {
    const processOrders = async () => {
      if (data) {
        const items = await Promise.all(
          data.map(async (order: any) => {
            const pickupAddress = await fetchAddress(order.restaurantLatLong);
            const dropoffAddress = await fetchAddress(order.userLatLong);
            return {
              orderId: order.orderId,
              totalBill: `$${order.totalPrice.toFixed(2)}`,
              pickupAddress: pickupAddress,
              dropoffAddress: dropoffAddress,
              restaurantName: order.restaurantName,
              userName: order.userName,
            };
          }),
        );
        setDeliveryItems(items);
      }
    };

    processOrders();
  }, [data]);
  return (
    <View style={styles.container}>
      <Text style={styles.topTitie}>Notification</Text>
      <View style={styles.line} />
      <View style={styles.padding}>
        {deliveryItems.map((val, index) => (
          <View key={index} style={styles.boxContainer}>
            <Text style={styles.userName}>
              {val.userName.toUpperCase()}
              <Text style={styles.subText}>{' Placed a new \n order'}</Text>
            </Text>
            <View style={styles.flexRow}>
              <View style={styles.box} />
              <Text style={styles.restName}>{val.pickupAddress}</Text>
            </View>
            <View style={styles.boxLine} />
            <View style={styles.flexRow}>
              <View style={styles.box} />
              <Text style={styles.restName}>{val.dropoffAddress}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default RiderNotificationScreen;
