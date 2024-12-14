import React from 'react';
import {View, Text, StyleSheet, Dimensions} from 'react-native';
import Svg, {Polyline, Circle, Line} from 'react-native-svg';
import Theme from '../../theme/Theme';

const {width} = Dimensions.get('window');
const chartHeight = 200;
const chartWidth = width - 40;

type ChartPoint = {
  time: string;
  value: number;
};

type ChartProps = {
  data: ChartPoint[];
  highlightIndex?: number;
};

const normalizeValue = (value: number, minValue: number, maxValue: number) =>
  ((value - minValue) / (maxValue - minValue)) * chartHeight;

const RiderChart: React.FC<ChartProps> = ({data, highlightIndex}) => {
  const maxValue = Math.max(...data.map(point => point.value));
  const minValue = Math.min(...data.map(point => point.value));
  const graphPoints = data
    .map(
      (point, index) =>
        `${(index / (data.length - 1)) * chartWidth},${
          chartHeight - normalizeValue(point.value, minValue, maxValue)
        }`,
    )
    .join(' ');

  return (
    <View style={styles.container}>
      <Svg width={chartWidth} height={chartHeight}>
        <Polyline
          points={graphPoints}
          fill="none"
          stroke="#4A90E2"
          strokeWidth={3}
        />
        {data.map((point, index) => (
          <Circle
            key={index}
            cx={(index / (data.length - 1)) * chartWidth}
            cy={chartHeight - normalizeValue(point.value, minValue, maxValue)}
            r={5}
            fill="#4A90E2"
            stroke="white"
            strokeWidth={2}
          />
        ))}
        {highlightIndex !== undefined && (
          <Line
            x1={(highlightIndex / (data.length - 1)) * chartWidth}
            y1={
              chartHeight -
              normalizeValue(data[highlightIndex].value, minValue, maxValue)
            }
            x2={(highlightIndex / (data.length - 1)) * chartWidth}
            y2={chartHeight}
            stroke="#888"
            strokeDasharray="4,2"
          />
        )}
      </Svg>
      <View style={styles.labels}>
        {data.map((point, index) => (
          <Text key={index} style={styles.labelText}>
            {point.time}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.responsiveSize.size10,
    shadowColor: Theme.colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: Theme.responsiveSize.size3,
    elevation: Theme.responsiveSize.size1,
    paddingVertical: Theme.responsiveSize.size10,
    paddingHorizontal: Theme.responsiveSize.size5,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelText: {
    fontSize: Theme.responsiveSize.size13,
    color: Theme.colors.appColor,
  },
});

export default RiderChart;
