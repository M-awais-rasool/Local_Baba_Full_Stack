import {View} from 'react-native';
import React from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {get_user_onGoing_order, Order_cancel} from '../../../../services';
import {OrderCard} from '../../../../components';
import styles from './styles';
import {isNetworkAvailable} from '../../../../api';
import {useToast} from 'react-native-toasty-toast';
import {Constants} from '../../../../constants';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import { ScrollView } from 'react-native';

const OngoingOrder = () => {
  const {showToast} = useToast();
  const nav: any = useNavigation();
  const queryClient = useQueryClient();

  const {data} = useQuery<any>({
    queryKey: ['onGoing'],
    queryFn: async () => {
      try {
        const isConnected = await isNetworkAvailable();
        if (!isConnected) {
          showToast('Check your internet!', 'error', 'bottom', 1000);
          return null;
        }
        const res: any = await get_user_onGoing_order();
        return res.data;
      } catch (err: any) {
        console.log(err.response?.data?.message || 'Error fetching profile');
        showToast(
          err.response?.data?.message || 'Error fetching profile',
          'error',
          'bottom',
          1000,
        );
        return null;
      }
    },
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
  });

  const handleCancelOrder = (id: string) => {
    OrderMutation.mutate(id);
  };
  const OrderMutation = useMutation({
    mutationFn: Order_cancel,
    onSuccess: data => {
      queryClient.invalidateQueries({queryKey: ['onGoing']});
      showToast(data.message, 'success', 'top', 1000);
    },
  });
  return (
    <ScrollView style={styles.container}>
      <View style={styles.marginV10} />
      {data?.map((data: any, index: number) => (
        <OrderCard
          key={index}
          name={data.name}
          restaurant={data.restaurantName}
          image={data?.image}
          price={data?.total_amount}
          items={data?.total_items - 1}
          orderId={data?.orderId}
          type="ongoing"
          status={data?.status}
          onTrackOrder={() =>
            nav.navigate(Constants.TRACK_ORDER, {id: data.orderId})
          }
          onCancel={() => handleCancelOrder(data.orderId)}
          onPress={() => {
            nav.navigate(Constants.ORDER_DETAILS, {id: data.orderId});
          }}
        />
      ))}
    </ScrollView>
  );
};

export default OngoingOrder;
