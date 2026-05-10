const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const filesToCreate = {
  // Screens
  'screens/auth/LoginScreen.tsx': `// src/screens/auth/LoginScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const LoginScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text>LoginScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default LoginScreen;`,

  'screens/auth/OnboardingScreen.tsx': `// src/screens/auth/OnboardingScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const OnboardingScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text>OnboardingScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default OnboardingScreen;`,

  'screens/dashboard/HomeScreen.tsx': `// src/screens/dashboard/HomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HomeScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text>HomeScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default HomeScreen;`,

  'screens/mother/MotherListScreen.tsx': `// src/screens/mother/MotherListScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MotherListScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text>MotherListScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default MotherListScreen;`,

  'screens/mother/MotherProfileScreen.tsx': `// src/screens/mother/MotherProfileScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MotherProfileScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text>MotherProfileScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default MotherProfileScreen;`,

  'screens/mother/AddMotherScreen.tsx': `// src/screens/mother/AddMotherScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AddMotherScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text>AddMotherScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default AddMotherScreen;`,

  'screens/visit/StartVisitScreen.tsx': `// src/screens/visit/StartVisitScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const StartVisitScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text>StartVisitScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default StartVisitScreen;`,

  'screens/visit/RiskScoreScreen.tsx': `// src/screens/visit/RiskScoreScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const RiskScoreScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text>RiskScoreScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default RiskScoreScreen;`,

  'screens/visit/DangerSignScreen.tsx': `// src/screens/visit/DangerSignScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const DangerSignScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text>DangerSignScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default DangerSignScreen;`,

  'screens/visit/VisitSummaryScreen.tsx': `// src/screens/visit/VisitSummaryScreen.tsx
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

export default VisitSummaryScreen;`,

  'screens/newborn/NewbornProfileScreen.tsx': `// src/screens/newborn/NewbornProfileScreen.tsx
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

export default NewbornProfileScreen;`,

  'screens/newborn/VisionScanScreen.tsx': `// src/screens/newborn/VisionScanScreen.tsx
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

export default VisionScanScreen;`,

  'screens/newborn/BreathScanScreen.tsx': `// src/screens/newborn/BreathScanScreen.tsx
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

export default BreathScanScreen;`,

  'screens/mentalhealth/EPDSScreen.tsx': `// src/screens/mentalhealth/EPDSScreen.tsx
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

export default EPDSScreen;`,

  // Components
  'components/VoiceButton.tsx': `// src/components/VoiceButton.tsx
import React from 'react';
import { View, Text } from 'react-native';

export const VoiceButton: React.FC = () => <View><Text>VoiceButton</Text></View>;`,

  'components/RiskBadge.tsx': `// src/components/RiskBadge.tsx
import React from 'react';
import { View, Text } from 'react-native';

export const RiskBadge: React.FC = () => <View><Text>RiskBadge</Text></View>;`,

  'components/AlertBanner.tsx': `// src/components/AlertBanner.tsx
import React from 'react';
import { View, Text } from 'react-native';

export const AlertBanner: React.FC = () => <View><Text>AlertBanner</Text></View>;`,

  'components/VisitCard.tsx': `// src/components/VisitCard.tsx
import React from 'react';
import { View, Text } from 'react-native';

export const VisitCard: React.FC = () => <View><Text>VisitCard</Text></View>;`,

  'components/SyncStatusBar.tsx': `// src/components/SyncStatusBar.tsx
import React from 'react';
import { View, Text } from 'react-native';

export const SyncStatusBar: React.FC = () => <View><Text>SyncStatusBar</Text></View>;`,

  // AI
  'ai/riskScorer.ts': `// src/ai/riskScorer.ts
export const calculateRiskScore = () => {};`,

  'ai/breathAnalyser.ts': `// src/ai/breathAnalyser.ts
export const analyzeBreath = () => {};`,

  'ai/visionAnalyser.ts': `// src/ai/visionAnalyser.ts
export const analyzeVision = () => {};`,

  'ai/dangerSignRules.ts': `// src/ai/dangerSignRules.ts
export const checkDangerSigns = () => {};`,

  // Database
  'database/db.ts': `// src/database/db.ts
export const initDB = () => {};`,

  'database/motherRepository.ts': `// src/database/motherRepository.ts
export const getMothers = () => {};`,

  'database/visitRepository.ts': `// src/database/visitRepository.ts
export const getVisits = () => {};`,

  'database/newbornRepository.ts': `// src/database/newbornRepository.ts
export const getNewborns = () => {};`,

  // Services
  'services/syncService.ts': `// src/services/syncService.ts
export const syncData = () => {};`,

  'services/voiceService.ts': `// src/services/voiceService.ts
export const startVoiceRecording = () => {};`,

  'services/alertService.ts': `// src/services/alertService.ts
export const sendAlert = () => {};`,

  'services/languageService.ts': `// src/services/languageService.ts
export const changeLanguage = () => {};`,

  // Locales
  'locales/hi.json': '{\n  "greeting": "नमस्ते"\n}',

  'locales/mr.json': '{\n  "greeting": "नमस्कार"\n}',

  // Utils
  'utils/constants.ts': `// src/utils/constants.ts
export const COLORS = {
  primary: '#C2185B',
  primaryLight: '#F48FB1',
  primaryDark: '#880E4F',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#F44336',
  white: '#FFFFFF',
  gray: '#9E9E9E',
  lightGray: '#F5F5F5',
  text: '#212121',
  textSecondary: '#757575',
};

export const RISK_THRESHOLDS = {
  HEMOGLOBIN_LOW: 11,
  HEMOGLOBIN_DANGER: 7,
  SYSTOLIC_WARNING: 140,
  SYSTOLIC_DANGER: 160,
  DIASTOLIC_WARNING: 90,
  DIASTOLIC_DANGER: 110,
  BLOOD_SUGAR_WARNING: 140,
  BLOOD_SUGAR_DANGER: 200,
};

export const API_BASE_URL = 'http://localhost:8000';
`,

  'utils/validators.ts': `// src/utils/validators.ts
export const isValidEmail = () => {};`,

  'utils/formatters.ts': `// src/utils/formatters.ts
export const formatDate = () => {};`,

  // Types
  'types/index.ts': `// src/types/index.ts
export interface Mother {
  id: string;
  ashaId: string;
  name: string;
  age: number;
  village: string;
  district: string;
  state: string;
  weeksPregnant: number;
  parity: number;
  hemoglobin: number;
  systolicBP: number;
  diastolicBP: number;
  bloodSugar: number;
  bmi: number;
  height: number;
  weight: number;
  riskTier: 'GREEN' | 'AMBER' | 'RED';
  riskScore: number;
  phone: string;
  abhaId: string;
  lastVisitDate: string;
  nextVisitDate: string;
  isSynced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Visit {
  id: string;
  motherId: string;
  ashaId: string;
  visitDate: string;
  visitType: 'ANC' | 'PNC' | 'NEWBORN';
  findings: string;
  riskScoreAtVisit: number;
  riskTierAtVisit: 'GREEN' | 'AMBER' | 'RED';
  dangerSignsFound: string[];
  actionTaken: string;
  referralMade: boolean;
  referralLocation: string;
  isSynced: boolean;
  createdAt: string;
}

export interface Newborn {
  id: string;
  motherId: string;
  ashaId: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE';
  birthWeight: number;
  estimatedWeight: number;
  jaundiceRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  breathingStatus: 'NORMAL' | 'ABNORMAL';
  nutritionStatus: 'NORMAL' | 'MAM' | 'SAM';
  breastfeedingStatus: boolean;
  immunisationsDue: string[];
  isSynced: boolean;
  createdAt: string;
}

export interface ASHAWorker {
  id: string;
  name: string;
  phone: string;
  village: string;
  district: string;
  state: string;
  preferredLanguage: string;
  pin: string;
}
`
};

Object.keys(filesToCreate).forEach(filePath => {
  const fullPath = path.join(srcDir, filePath);
  const dirPath = path.dirname(fullPath);
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, filesToCreate[filePath], 'utf8');
  console.log('Created:', fullPath);
});
