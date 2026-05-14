import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  handleRestart = () => {
    // Simply reset the error state to try rendering again
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Ionicons name="alert-circle-outline" size={80} color="#C2185B" />
            <Text style={styles.title}>क्षमा करें, कुछ गलत हो गया</Text>
            <Text style={styles.subtitle}>Sorry, something went wrong.</Text>
            
            <Text style={styles.errorText} numberOfLines={3}>
              {this.state.error?.message}
            </Text>

            <TouchableOpacity style={styles.btn} onPress={this.handleRestart}>
              <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.btnText}>Restart App / फिर से चालू करें</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCE4EC', justifyContent: 'center' },
  content: { alignItems: 'center', padding: 24, backgroundColor: '#fff', margin: 20, borderRadius: 20, elevation: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#212121', marginTop: 16, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#757575', marginTop: 4, marginBottom: 16 },
  errorText: { fontSize: 12, color: '#D32F2F', backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8, width: '100%', marginBottom: 24 },
  btn: { flexDirection: 'row', backgroundColor: '#C2185B', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default ErrorBoundary;
