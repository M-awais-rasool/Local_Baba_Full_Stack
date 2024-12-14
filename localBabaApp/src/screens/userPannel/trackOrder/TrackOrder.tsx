import {View} from 'react-native';
import React, {useEffect} from 'react';
import {Header, OrderProgress} from '../../../components';
import styles from './styles';
import {useQuery} from '@tanstack/react-query';
import {isNetworkAvailable} from '../../../api';
import {useToast} from 'react-native-toasty-toast';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {get_user_order_status} from '../../../services';

const TrackOrder = (props: any) => {
  const {id} = props.route.params;
  const {showToast} = useToast();
  const isFocused = useIsFocused();
  const navigation: any = useNavigation();

  const steps = [
    {
      title: 'Order Confirmed',
      description: 'Your order has been confirmed and is being processed',
    },
    {
      title: 'Preparing',
      description: 'Restaurant is preparing your delicious meal',
    },
    {
      title: 'On the Way',
      description: 'Your order has been picked up for delivery',
    },
    {
      title: 'Delivered',
      description: 'Enjoy your meal!',
    },
  ];

  const {data, refetch} = useQuery({
    queryKey: ['orderStatus'],
    queryFn: async () => {
      try {
        const isConnected = await isNetworkAvailable();
        if (!isConnected) {
          showToast('Check your internet!', 'error', 'bottom', 1000);
          return null;
        }
        const cleanOrderId = id.replace('#', '');
        const res = await get_user_order_status(cleanOrderId);
        if (res?.status === 'Accepted') {
          res.status_code = res.status_code + 1;
        }
        return res;
      } catch (err: any) {
        showToast(
          err.response?.data?.message || 'An error occurred',
          'error',
          'bottom',
          1000,
        );
        return null;
      }
    },
    enabled: isFocused,
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      refetch();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [refetch]);

  return (
    <View style={styles.container}>
      <Header
        isBack
        isBackTitle="Track my order"
        onlyBack
        onBack={() => navigation.goBack()}
      />
      <OrderProgress currentStep={data?.status_code || 0} steps={steps} />
    </View>
  );
};

export default TrackOrder;
