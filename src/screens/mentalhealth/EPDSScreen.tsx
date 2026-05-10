// src/screens/mentalhealth/EPDSScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const EPDSScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text>EPDSScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default EPDSScreen;