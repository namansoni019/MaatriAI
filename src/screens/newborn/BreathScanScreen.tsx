// src/screens/newborn/BreathScanScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BreathScanScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text>BreathScanScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default BreathScanScreen;