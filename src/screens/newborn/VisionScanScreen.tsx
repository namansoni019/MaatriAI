// src/screens/newborn/VisionScanScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const VisionScanScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text>VisionScanScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default VisionScanScreen;