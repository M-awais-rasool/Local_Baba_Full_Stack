import {View, Text, Image, TouchableOpacity, ScrollView} from 'react-native';
import React, {useEffect, useState} from 'react';
import {CountBox, DeliveryPopup, RiderChart} from '../../../components';
import {useQuery} from '@tanstack/react-query';
import {isNetworkAvailable} from '../../../api';
import {useToast} from 'react-native-toasty-toast';
import {
  get_completed_order_count,
  get_new_order_count,
  get_profile,
  get_rider_chart,
  get_today_order,
} from '../../../services';
import styles from './styles';
import {
  fetchAddress,
  getAddress,
  GetCurrentLocation,
} from '../../../hooks/Hooks';
import {Constants} from '../../../constants';
import {useIsFocused} from '@react-navigation/native';
import Theme from '../../../theme/Theme';

const RiderHome = (props: any) => {
  const {showToast} = useToast();
  const isFocused = useIsFocused();
  const [city, setCity] = useState<string>('');
  const [deliveryItems, setDeliveryItems] = useState<any[]>([]);

  const chartData = [
    {time: 'Sun', value: 2},
    {time: 'Mon', value: 1},
    {time: 'Tue', value: 2},
    {time: 'Wed', value: 2},
    {time: 'Thu', value: 1},
    {time: 'Fri', value: 1},
    {time: 'Sat', value: 1},
  ];
  const {data} = useQuery({
    queryKey: ['newOrderCount'],
    queryFn: async () => {
      try {
        const isConnected = await isNetworkAvailable();
        if (!isConnected) {
          showToast('Check your internet!', 'error', 'bottom', 1000);
          return;
        }
        const res = await get_new_order_count();
        if (res.status == 'success') {
          return res.totalOrders;
        } else {
          return null;
        }
      } catch (err: any) {
        console.log(err.response.data.message);
        showToast(err.response.data.message, 'error', 'bottom', 1000);
      }
    },
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
  });

  const {data: completedOrderCount} = useQuery({
    queryKey: ['completedOrderCount'],
    queryFn: async () => {
      try {
        const isConnected = await isNetworkAvailable();
        if (!isConnected) {
          showToast('Check your internet!', 'error', 'bottom', 1000);
          return;
        }
        const res = await get_completed_order_count();
        if (res.status == 'success') {
          return res.totalOrders;
        } else {
          return null;
        }
      } catch (err: any) {
        console.log(err.response.data.message);
        showToast(err.response.data.message, 'error', 'bottom', 1000);
      }
    },
  });

  const {data: prifile} = useQuery({
    queryKey: ['homeprofile'],
    queryFn: async () => {
      try {
        const isConnected = await isNetworkAvailable();
        if (!isConnected) {
          showToast('Check your internet!', 'error', 'bottom', 1000);
          return null;
        }
        const res = await get_profile();
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
    enabled: isFocused,
  });
  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const locationRes: any = await GetCurrentLocation();
      const {latitude, longitude} = locationRes;
      const res: any = await getAddress(latitude, longitude);
      setCity(res?.city);
    } catch (err) {
      console.log(err);
    }
  };

  const {data: delivered} = useQuery({
    queryKey: ['deliveredOrderToday'],
    queryFn: async () => {
      try {
        const isConnected = await isNetworkAvailable();
        if (!isConnected) {
          showToast('Check your internet!', 'error', 'bottom', 1000);
          return;
        }
        const res = await get_today_order();
        console.log(res)
        if (res.status == 'success') {
          console.log(res.data)
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

  const {data: chart} = useQuery({
    queryKey: ['chart'],
    queryFn: async () => {
      try {
        const isConnected = await isNetworkAvailable();
        if (!isConnected) {
          showToast('Check your internet!', 'error', 'bottom', 1000);
          return;
        }
        const res = await get_rider_chart();
        if (res.status == 'success') {
          return res;
        } else {
          return null;
        }
      } catch (err: any) {
        console.log(err.response.data.message);
        showToast(err.response.data.message, 'error', 'bottom', 1000);
      }
    },
    enabled: isFocused,
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    const processOrders = async () => {
      if (delivered) {
        const items = await Promise.all(
          delivered.map(async (order: any) => {
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
  }, [delivered]);

  const getDayOfWeek = (date: string): string => {
    const parsedDate = new Date(date);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[parsedDate.getDay()];
  };

  const updatedChartData = React.useMemo(() => {
    if (!chart || chart?.data?.length === 0) {
      return chartData;
    }
    const aggregatedData: Record<string, number> = {};
    chart?.data?.forEach((entry: {date: string; margin: number}) => {
      const day = getDayOfWeek(entry.date);
      if (!aggregatedData[day]) {
        aggregatedData[day] = 0;
      }
      aggregatedData[day] += entry.margin;
    });
    const updatedData = chartData.map(day => {
      const updatedValue = aggregatedData[day.time] ?? day.value;
      return {
        ...day,
        value: updatedValue,
      };
    });

    return updatedData;
  }, [chart]);
  return (
    <ScrollView style={styles.container}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <View>
          <Text style={styles.topHeading}>{'Location'}</Text>
          <Text style={styles.topSubHeading}>
            {city ? city : 'kamalia'}
            {', Pakistan'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            props.navigation.navigate(Constants.RIDER_PROFILE_SCREEN)
          }>
          <Image
            source={{
              uri: prifile?.image || 'https://via.placeholder.com/100',
            }}
            style={styles.profileImage}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.boxContainer}>
        <CountBox
          title="Completed Orders"
          count={completedOrderCount}
          isDisabled={true}
        />
        <CountBox
          title="Order Requests"
          count={data}
          isDisabled={false}
          onPress={() =>
            props.navigation.navigate(Constants.ORDER_REQUEST_SCREEN)
          }
        />
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>{'Total Revenue'}</Text>
        <Text style={styles.subTitle}>{'Weekly'}</Text>
      </View>
      <Text style={styles.totalRevenue}>RS {chart?.totalMargin}</Text>
      <RiderChart data={updatedChartData||chartData} />
      <View style={{marginTop: Theme.responsiveSize.size20}} />
      <Text style={styles.label}>{'Recent Orders'}</Text>
      {deliveryItems.map((val, index) => (
        <View key={index} style={styles.boxDeliveredContainer}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.label}>
              {'Order Id:'} <Text>{val.orderId}</Text>
            </Text>
            <View style={styles.deliveryBox}>
              <Text>{'Delivered'}</Text>
            </View>
          </View>
          <View style={styles.flexRow}>
            <Image source={Theme.icons.vector} />
            <Text style={styles.label}>{'Pickup'}</Text>
          </View>
          <Text style={styles.info}>{val.pickupAddress}</Text>

          <View>
            <View style={styles.boxLine} />
          </View>

          <View
            style={[styles.flexRow, {marginTop: Theme.responsiveSize.size15}]}>
            <Image source={Theme.icons.vector} />
            <Text style={styles.label}>{'Drop-Off'}</Text>
          </View>
          <Text style={styles.info}>{val.dropoffAddress}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

export default RiderHome;
