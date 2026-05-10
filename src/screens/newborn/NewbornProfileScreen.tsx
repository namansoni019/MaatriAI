// src/screens/newborn/NewbornProfileScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NewbornProfileScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text>NewbornProfileScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default NewbornProfileScreen;