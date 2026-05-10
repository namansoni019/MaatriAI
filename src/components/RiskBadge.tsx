import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface RiskBadgeProps {
  tier: 'GREEN' | 'AMBER' | 'RED';
  size?: 'sm' | 'lg';
}

const RiskBadge: React.FC<RiskBadgeProps> = ({ tier, size = 'sm' }) => {
  let bgColor = '#E8F5E9';
  let textColor = '#388E3C';
  let label = 'Low Risk / कम जोखिम';

  if (tier === 'AMBER') {
    bgColor = '#FFF3E0';
    textColor = '#F57C00';
    label = 'Medium / मध्यम';
  } else if (tier === 'RED') {
    bgColor = '#FFEBEE';
    textColor = '#D32F2F';
    label = 'High Risk / उच्च जोखिम';
  }

  const paddingVertical = size === 'lg' ? 6 : 4;
  const paddingHorizontal = size === 'lg' ? 14 : 10;
  const fontSize = size === 'lg' ? 14 : 11;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor, paddingVertical, paddingHorizontal }]}>
      <Text style={[styles.text, { color: textColor, fontSize }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { 
    borderRadius: 99, 
    alignSelf: 'flex-start' 
  },
  text: { 
    fontWeight: 'bold' 
  }
});

export default RiskBadge;