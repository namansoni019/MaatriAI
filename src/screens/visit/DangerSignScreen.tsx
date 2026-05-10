import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Linking } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { speak } from '../../services/voiceService';
import { EvaluationResult } from '../../ai/dangerSignRules';

const DangerSignScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
  const result: EvaluationResult = route.params?.result;

  useEffect(() => {
    if (result && result.overallVoiceAlert) {
      speak(result.overallVoiceAlert);
    }
  }, [result]);

  if (!result) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, color: 'red' }}>Error: No result passed.</Text>
        <Text style={{ margin: 20 }}>Params: {JSON.stringify(route.params)}</Text>
        <TouchableOpacity 
          style={styles.completeBtn} 
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.completeBtnText}>Go to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (result.level === 'DANGER') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#F44336' }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.headerCentered}>
            <Ionicons name="warning" size={64} color="#fff" />
            <Text style={styles.emergencyTitle}>🚨 EMERGENCY / आपातकाल</Text>
          </View>
          
          {result.detectedSigns.map(sign => (
            <View key={sign.id} style={styles.card}>
              <Text style={styles.signNameHindi}>{sign.nameHindi}</Text>
              <Text style={styles.signName}>{sign.name}</Text>
              <View style={styles.actionBox}>
                <Ionicons name="medical" size={20} color="#D32F2F" />
                <Text style={styles.actionText}>{sign.immediateActionHindi}</Text>
              </View>
              <Text style={styles.actionTextEng}>{sign.immediateAction}</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL('tel:8800112234')}>
            <Ionicons name="call" size={24} color="#C2185B" />
            <Text style={styles.btnText}>📞 Call ANM Supervisor</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.goBtn}>
            <Ionicons name="navigate" size={24} color="#C2185B" />
            <Text style={styles.btnText}>🏥 Go to PHC/FRU</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.goBtn, { marginTop: 16 }]} 
            onPress={() => navigation.navigate('RiskScore', { 
              motherId: route.params?.motherId, 
              evaluationResult: result, 
              answers: route.params?.answers 
            })}
          >
            <Ionicons name="analytics" size={24} color="#C2185B" />
            <Text style={styles.btnText}>📊 View Full Risk Score</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (result.level === 'WARNING') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.orangeTop}>
          <Ionicons name="alert-circle" size={64} color="#fff" />
          <Text style={styles.warningTitle}>⚠️ Attention / ध्यान दें</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {result.detectedSigns.map(sign => (
            <View key={sign.id} style={styles.warningCard}>
              <Text style={styles.signNameHindi}>{sign.nameHindi}</Text>
              <Text style={styles.signName}>{sign.name}</Text>
              <Text style={styles.actionTextEng}>{sign.immediateAction}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.monitorBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.monitorBtnText}>Monitor closely. Visit again in 2 days.</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.monitorBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#FF9800', marginTop: 16 }]} 
            onPress={() => navigation.navigate('RiskScore', { 
              motherId: route.params?.motherId, 
              evaluationResult: result, 
              answers: route.params?.answers 
            })}
          >
            <Text style={[styles.monitorBtnText, { color: '#FF9800' }]}>📊 View Full Risk Score</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // SAFE level
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.greenTop}>
        <Ionicons name="checkmark-circle" size={80} color="#fff" />
        <Text style={styles.safeTitle}>✅ All Clear / सब ठीक है</Text>
      </View>
      <View style={styles.safeContent}>
        <Text style={styles.summaryText}>No danger signs detected.</Text>
        <Text style={styles.summaryText}>Risk Score: {result.riskScore} ({result.riskTier})</Text>
        
        <TouchableOpacity style={styles.completeBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.completeBtnText}>Complete Visit / यात्रा पूरी करें</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { padding: 20, alignItems: 'center' },
  headerCentered: { alignItems: 'center', marginVertical: 30 },
  emergencyTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 10, textAlign: 'center' },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '100%', marginBottom: 16, elevation: 4 },
  signNameHindi: { fontSize: 22, fontWeight: 'bold', color: '#D32F2F', marginBottom: 4 },
  signName: { fontSize: 16, color: '#757575', marginBottom: 16 },
  actionBox: { flexDirection: 'row', backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8, alignItems: 'center' },
  actionText: { color: '#D32F2F', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  actionTextEng: { color: '#757575', fontSize: 14, marginTop: 8, fontStyle: 'italic' },

  callBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 16 },
  goBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  btnText: { color: '#C2185B', fontSize: 18, fontWeight: 'bold', marginLeft: 12 },

  orangeTop: { backgroundColor: '#FF9800', height: '50%', justifyContent: 'center', alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  warningTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 10 },
  scrollContent: { padding: 20, paddingTop: 30 },
  warningCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FFB74D' },
  monitorBtn: { backgroundColor: '#FF9800', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  monitorBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  greenTop: { backgroundColor: '#4CAF50', height: '40%', justifyContent: 'center', alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  safeTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 10 },
  safeContent: { padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryText: { fontSize: 18, color: '#424242', marginBottom: 8 },
  completeBtn: { backgroundColor: '#C2185B', borderRadius: 12, padding: 18, width: '100%', alignItems: 'center', marginTop: 40 },
  completeBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default DangerSignScreen;