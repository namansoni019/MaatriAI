// src/screens/visit/VisitSummaryScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const VisitSummaryScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text>VisitSummaryScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default VisitSummaryScreen;