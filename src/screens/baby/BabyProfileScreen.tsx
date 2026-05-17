import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Animated, Easing, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { getBabyById } from '../../database/babyRepository';
import { getVisitsByBaby, getScheduledVisits } from '../../database/babyVisitRepository';
import { getMotherById } from '../../database/motherRepository';
import { Baby, BabyVisit, ScheduledVisit, Mother } from '../../types';

const screenWidth = Dimensions.get('window').width;

const BabyProfileScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { babyId } = route.params;

  const [baby, setBaby] = useState<Baby | null>(null);
  const [mother, setMother] = useState<Mother | null>(null);
  const [visits, setVisits] = useState<BabyVisit[]>([]);
  const [schedule, setSchedule] = useState<ScheduledVisit[]>([]);
  const [ageDays, setAgeDays] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const loadData = async () => {
    const b = await getBabyById(babyId);
    if (!b) return;
    setBaby(b);

    const m = await getMotherById(b.motherId);
    if (m) setMother(m);

    const v = await getVisitsByBaby(babyId);
    setVisits(v);

    const s = await getScheduledVisits(babyId, b.dateOfBirth);
    setSchedule(s);

    const msDiff = Date.now() - new Date(b.dateOfBirth).getTime();
    setAgeDays(Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24))));
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
      ).start();
    }
  }, [isFocused]);

  if (!baby) return null;

  const latestVisit = visits.length > 0 ? visits[visits.length - 1] : null;

  const renderTimelineNode = (sv: ScheduledVisit) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const expStr = sv.expectedDate.split('T')[0];
    
    let state = 'UPCOMING';
    if (sv.isCompleted) state = 'COMPLETED';
    else if (expStr === todayStr) state = 'DUE_TODAY';
    else if (new Date(expStr).getTime() < Date.now()) state = 'OVERDUE';

    return (
      <View key={sv.day} style={styles.timelineNodeContainer}>
        <View style={styles.nodeLeft}>
          {state === 'COMPLETED' && <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />}
          {state === 'UPCOMING' && <Ionicons name="ellipse-outline" size={28} color="#9E9E9E" />}
          {state === 'DUE_TODAY' && (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons name="alert-circle" size={28} color="#E91E8C" />
            </Animated.View>
          )}
          {state === 'OVERDUE' && <Ionicons name="warning" size={28} color="#D32F2F" />}
          
          <View style={styles.nodeTextWrapper}>
            <Text style={styles.nodeTitle}>Day {sv.day} Visit</Text>
            {state === 'COMPLETED' && <Text style={styles.nodeSub}>Done: {sv.actualDate?.split('T')[0]}</Text>}
            {state === 'UPCOMING' && <Text style={styles.nodeSub}>Due: {expStr}</Text>}
            {state === 'DUE_TODAY' && <Text style={[styles.nodeSub, { color: '#E91E8C', fontWeight: 'bold' }]}>Due Today!</Text>}
            {state === 'OVERDUE' && <Text style={[styles.nodeSub, { color: '#D32F2F', fontWeight: 'bold' }]}>Overdue</Text>}
          </View>
        </View>

        {(state === 'DUE_TODAY' || state === 'OVERDUE') && (
          <TouchableOpacity 
            style={[styles.startVisitBtn, state === 'OVERDUE' && { backgroundColor: '#D32F2F' }]}
            onPress={() => navigation.navigate('BabyVisit', { babyId: baby.id, visitDay: sv.day })}
          >
            <Text style={styles.startVisitText}>{state === 'OVERDUE' ? 'Start Now' : 'Start Visit'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const chartData = {
    labels: ['Birth', ...visits.map(v => `D${v.visitDay}`)],
    datasets: [{
      data: [baby.birthWeightKg || 0, ...visits.map(v => v.weightKg || baby.birthWeightKg || 0)]
    }]
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.headerGradient, { paddingTop: insets.top + 16, opacity: fadeAnim }]}>
        <LinearGradient colors={['#0277BD', '#0097A7', '#00796B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Baby Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.profileMeta}>
          <View style={styles.avatar}>
            <Ionicons name={baby.gender === 'FEMALE' ? 'female' : 'male'} size={32} color="#0097A7" />
          </View>
          <View style={styles.metaTextWrapper}>
            <Text style={styles.nameText}>{baby.name}</Text>
            <View style={styles.pillRow}>
              <View style={styles.pill}><Text style={styles.pillText}>{ageDays} days old</Text></View>
              <View style={styles.pill}><Text style={styles.pillText}>{baby.birthWeightKg} kg at birth</Text></View>
            </View>
          </View>
        </View>
      </Animated.View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
        
        {/* Latest Assessment */}
        {latestVisit && (
          <View style={[
            styles.assessmentCard, 
            latestVisit.overallAssessment === 'SAFE' ? { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' } :
            latestVisit.overallAssessment === 'MONITOR' ? { backgroundColor: '#FFF3E0', borderColor: '#FF9800' } :
            { backgroundColor: '#FFEBEE', borderColor: '#F44336' }
          ]}>
            <Ionicons 
              name={latestVisit.overallAssessment === 'SAFE' ? 'shield-checkmark' : latestVisit.overallAssessment === 'MONITOR' ? 'eye' : 'warning'} 
              size={32} 
              color={latestVisit.overallAssessment === 'SAFE' ? '#2E7D32' : latestVisit.overallAssessment === 'MONITOR' ? '#E65100' : '#D32F2F'} 
            />
            <View style={{ marginLeft: 16, flex: 1 }}>
              <Text style={[
                styles.assessmentTitle, 
                { color: latestVisit.overallAssessment === 'SAFE' ? '#2E7D32' : latestVisit.overallAssessment === 'MONITOR' ? '#E65100' : '#D32F2F' }
              ]}>
                {latestVisit.overallAssessment === 'SAFE' ? 'Baby is healthy' : 
                 latestVisit.overallAssessment === 'MONITOR' ? 'Needs monitoring' : 'Requires immediate referral'}
              </Text>
              <Text style={styles.assessmentSub}>From Day {latestVisit.visitDay} visit</Text>
            </View>
          </View>
        )}

        {/* Visit Schedule */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Visit Schedule</Text>
          <View style={styles.timelineWrapper}>
            {schedule.map((sv, index) => (
              <React.Fragment key={sv.day}>
                {renderTimelineNode(sv)}
                {index < schedule.length - 1 && <View style={styles.timelineLine} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Growth Chart */}
        {chartData.datasets[0].data.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weight Tracking</Text>
            <LineChart
              data={chartData}
              width={screenWidth - 64} // from padding
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 2,
                color: (opacity = 1) => `rgba(0, 151, 167, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: "6", strokeWidth: "2", stroke: "#0277BD" }
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16 }}
            />
          </View>
        )}

        {/* Tools / Scans */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tools & Scans</Text>
          <TouchableOpacity 
            style={styles.toolRow} 
            onPress={() => navigation.navigate('VisionScan', { newbornId: baby.id })} // fallback compat
          >
            <View style={[styles.toolIcon, { backgroundColor: '#FFF9C4' }]}><Ionicons name="eye" size={24} color="#FBC02D" /></View>
            <Text style={styles.toolText}>Jaundice Vision Scan</Text>
            <Ionicons name="chevron-forward" size={24} color="#9E9E9E" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity 
            style={styles.toolRow}
            onPress={() => navigation.navigate('BreathScan', { newbornId: baby.id })} // fallback compat
          >
            <View style={[styles.toolIcon, { backgroundColor: '#E1F5FE' }]}><Ionicons name="mic" size={24} color="#03A9F4" /></View>
            <Text style={styles.toolText}>Breathing Audio Scan</Text>
            <Ionicons name="chevron-forward" size={24} color="#9E9E9E" />
          </TouchableOpacity>
        </View>

        {/* Mother Link */}
        {mother && (
          <TouchableOpacity 
            style={styles.motherLinkCard}
            onPress={() => navigation.navigate('MotherProfile', { motherId: mother.id, motherName: mother.name })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.motherAvatar}><Text style={styles.motherAvatarText}>{mother.name.charAt(0)}</Text></View>
              <View style={{ marginLeft: 16 }}>
                <Text style={styles.motherLabel}>Mother</Text>
                <Text style={styles.motherName}>{mother.name}</Text>
              </View>
            </View>
            <Ionicons name="arrow-forward-circle" size={32} color="#C2185B" />
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4F9' },
  headerGradient: { paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 8, shadowColor: '#00796B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  
  profileMeta: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  metaTextWrapper: { marginLeft: 16, flex: 1 },
  nameText: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 6 },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
  pillText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  scrollContent: { padding: 16 },
  
  assessmentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  assessmentTitle: { fontSize: 18, fontWeight: 'bold' },
  assessmentSub: { fontSize: 14, color: '#666', marginTop: 4 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#00796B', marginBottom: 16 },
  
  timelineWrapper: { paddingLeft: 8 },
  timelineNodeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4 },
  nodeLeft: { flexDirection: 'row', alignItems: 'center' },
  nodeTextWrapper: { marginLeft: 16 },
  nodeTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E' },
  nodeSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  timelineLine: { width: 2, height: 20, backgroundColor: '#E0E0E0', marginLeft: 13 },

  startVisitBtn: { backgroundColor: '#E91E8C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  startVisitText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  toolRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  toolIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  toolText: { flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '600', color: '#1A1A2E' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 60 },

  motherLinkCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 3, shadowColor: '#C2185B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  motherAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' },
  motherAvatarText: { color: '#C2185B', fontSize: 20, fontWeight: 'bold' },
  motherLabel: { fontSize: 12, color: '#9E9E9E' },
  motherName: { fontSize: 18, fontWeight: 'bold', color: '#C2185B' }
});

export default BabyProfileScreen;
