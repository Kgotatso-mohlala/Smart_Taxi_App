import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { getToken, fetchData } from '../api/api';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import io from 'socket.io-client';

const { width: windowWidth } = Dimensions.get('window');

type RootStackParamList = {
  Home: { acceptedTaxiId?: string };
  requestRide: undefined;
  ViewTaxi: undefined;
  ViewRequests: undefined;
  LiveChat: undefined;
  TaxiManagement: undefined;
  Profile: undefined;
};

type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
  onNavigate: (screen: keyof RootStackParamList) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isVisible, onClose, onNavigate }) => {
  const slideAnim = useRef(new Animated.Value(-250)).current;
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : -250,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.sidebar,
        { transform: [{ translateX: slideAnim }] },
      ]}
    >
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarTitle}>Menu</Text>
        <TouchableOpacity onPress={onClose}>
          <FontAwesome name="close" size={24} color="#003E7E" />
        </TouchableOpacity>
      </View>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>Shesha</Text>
      </View>
      <TouchableOpacity style={styles.sidebarButton} onPress={() => { onNavigate('Home'); onClose(); }}>
        <FontAwesome name="home" size={22} color="#003E7E" />
        <Text style={styles.sidebarButtonText}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.sidebarButton} onPress={() => { onNavigate('requestRide'); onClose(); }}>
        <FontAwesome name="car" size={22} color="#003E7E" />
        <Text style={styles.sidebarButtonText}>Request Ride</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.sidebarButton} onPress={() => { onNavigate('ViewTaxi'); onClose(); }}>
        <MaterialIcons name="directions-car" size={22} color="#003E7E" />
        <Text style={styles.sidebarButtonText}>View Taxis</Text>
      </TouchableOpacity>
      <View style={styles.sidebarDivider} />
      <TouchableOpacity style={styles.sidebarButton} onPress={() => { onNavigate('ViewRequests'); onClose(); }}>
        <FontAwesome name="search" size={22} color="#003E7E" />
        <Text style={styles.sidebarButtonText}>Search Rides</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.sidebarButton} onPress={() => { onNavigate('LiveChat'); onClose(); }}>
        <FontAwesome name="comment" size={22} color="#003E7E" />
        <Text style={styles.sidebarButtonText}>Live Chat</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.sidebarButton} onPress={() => { onNavigate('TaxiManagement'); onClose(); }}>
        <FontAwesome name="map" size={22} color="#003E7E" />
        <Text style={styles.sidebarButtonText}>Manage Taxi</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.sidebarButton} onPress={() => { onNavigate('Profile'); onClose(); }}>
        <FontAwesome name="user" size={22} color="#003E7E" />
        <Text style={styles.sidebarButtonText}>Profile</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface HomeContentProps {
  userName: string | null;
}

const HomeContent: React.FC<HomeContentProps> = ({ userName }) => {
  return (
    <View style={styles.homeContent}>
      <Text style={styles.greetingText}>
        {userName ? `Welcome back, ${userName}!` : 'Welcome to Taxi Tracker!'}
      </Text>
    </View>
  );
};

interface LiveStatusProps {
  monitoredTaxi: TaxiInfo | null;
  onEndMonitoring: () => void;
}

interface TaxiInfo {
  numberPlate: string;
  status: string;
  currentStop: string;
  currentLoad: number;
  routeName: string;
  nextStop: string;
  driverUsername: string;
}

const LiveStatus: React.FC<LiveStatusProps> = ({ monitoredTaxi, onEndMonitoring }) => {
  return (
    <View style={styles.liveStatus}>
      <Text style={styles.statusTitle}>Live Taxi Status</Text>
      {monitoredTaxi ? (
        <View style={styles.taxiDetails}>
          <Text style={styles.taxiText}>Plate: {monitoredTaxi.numberPlate}</Text>
          <Text style={styles.taxiText}>Status: {monitoredTaxi.status}</Text>
          <Text style={styles.taxiText}>Current Stop: {monitoredTaxi.currentStop}</Text>
          <Text style={styles.taxiText}>Load: {monitoredTaxi.currentLoad}</Text>
          <Text style={styles.taxiText}>Route: {monitoredTaxi.routeName}</Text>
          <Text style={styles.taxiText}>Next Stop: {monitoredTaxi.nextStop}</Text>
          <Text style={styles.taxiText}>Driver: {monitoredTaxi.driverUsername}</Text>
          <TouchableOpacity style={styles.endMonitorButton} onPress={onEndMonitoring}>
            <FontAwesome name="close" size={20} color="#FFF" />
            <Text style={styles.endMonitorText}>Stop Monitoring</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.taxiDetails}>
          <Text style={styles.taxiText}>No taxi monitoring in progress.</Text>
        </View>
      )}
    </View>
  );
};

const HomeScreen = () => {
  const apiUrl = 'https://shesha.onrender.com';
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [monitoredTaxi, setMonitoredTaxi] = useState<TaxiInfo | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-30)).current;
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  const route = useRoute<HomeScreenRouteProp>();
  const acceptedTaxiId = route.params?.acceptedTaxiId;
  const navigation = useNavigation<StackNavigationProp<any, 'Home'>>();

  useEffect(() => {
    console.log('Connecting to socket...');
    const newSocket = io(apiUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => console.log('Socket connected'));
    newSocket.on('disconnect', () => console.log('Socket disconnected'));
    newSocket.on('connect_error', (err: Error) => console.log('Socket connection error:', err));

    return () => {
      console.log('Closing socket connection');
      newSocket.close();
    };
  }, [apiUrl]);

  useEffect(() => {
    const fetchUserData = async () => {
      console.log('Fetching user data...');
      const token = await getToken();
      if (token) {
        try {
          const response = await fetchData(apiUrl, 'api/users/get-user', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response?.user) {
            console.log('User data fetched:', response.user.name);
            setUserName(response.user.name);
          } else {
            console.log('User data fetch failed, no user in response');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          Alert.alert('Error', 'Failed to fetch user data.');
        }
      } else {
        console.log('No token found, skipping user data fetch');
      }
      setIsLoading(false);
    };

    fetchUserData();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (acceptedTaxiId && !monitoredTaxi) {
      console.log('Attempting to monitor taxi with ID:', acceptedTaxiId);
      handleMonitorTaxi();
    }
  }, [acceptedTaxiId, socket]);

  useEffect(() => {
    if (socket && acceptedTaxiId) {
      console.log('Setting up taxiUpdateForPassenger listener');
      socket.on('taxiUpdateForPassenger', (taxiInfo: TaxiInfo) => {
        console.log('Received taxiUpdateForPassenger:', taxiInfo);
        if (monitoredTaxi && monitoredTaxi.numberPlate === taxiInfo.numberPlate) {
          console.log('Updating monitored taxi info');
          setMonitoredTaxi(taxiInfo);
        }
      });

      return () => {
        console.log('Removing taxiUpdateForPassenger listener');
        if (socket) {
          socket.off('taxiUpdateForPassenger');
        }
      };
    }
  }, [socket, monitoredTaxi]);

  useEffect(() => {
    if (socket && monitoredTaxi) {
      socket.on('taxiUpdate', (updatedTaxi: TaxiInfo) => {
        if (monitoredTaxi.numberPlate === updatedTaxi.numberPlate) {
          console.log('Received taxiUpdate, updating monitored taxi:', updatedTaxi);
          setMonitoredTaxi(updatedTaxi);
        }
      });

      return () => {
        if (socket) {
          socket.off('taxiUpdate');
        }
      };
    }
  }, [socket, monitoredTaxi]);

  const handleMonitorTaxi = async () => {
    console.log('handleMonitorTaxi called');
    const token = await getToken();
    if (!token) {
      console.log('No token for taxi monitoring');
      Alert.alert('Authentication Error', 'Please login to monitor taxis.');
      return;
    }
    if (!acceptedTaxiId) {
      console.log('No taxi ID for monitoring');
      Alert.alert('No Taxi Assigned', 'There is no taxi assigned to your ride yet.');
      return;
    }
    try {
      console.log('Fetching taxi monitoring details');
      const endpoint = `api/taxis/${acceptedTaxiId}/monitor`;
      const response = await fetchData(apiUrl, endpoint, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response?.taxiInfo) {
        console.log('Taxi monitoring details fetched:', response.taxiInfo);
        setMonitoredTaxi(response.taxiInfo);
      } else {
        console.log('Failed to fetch taxi details for monitoring');
        Alert.alert('Error', 'Failed to fetch taxi details.');
      }
    } catch (error) {
      console.error('Error monitoring taxi:', error);
      Alert.alert('Error', 'Failed to monitor taxi.');
    }
  };

  const handleEndMonitoring = () => {
    console.log('Ending taxi monitoring');
    setMonitoredTaxi(null);
    navigation.setParams({ acceptedTaxiId: undefined });
  };

  if (isLoading) {
    return <Loading />;
  }

  const handleNavigate = (screen: keyof RootStackParamList) => {
    navigation.navigate(screen);
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#E8F0FE']} style={styles.gradient}>
      <View style={styles.navBar}>
        <Text style={styles.navLogo}>Shesha</Text>
        <TouchableOpacity style={styles.toggleButton} onPress={toggleSidebar}>
          <FontAwesome name="bars" size={28} color="#003E7E" />
        </TouchableOpacity>
      </View>
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Sidebar isVisible={sidebarVisible} onClose={toggleSidebar} onNavigate={handleNavigate} />
        <ScrollView contentContainerStyle={styles.mainContent}>
          <HomeContent userName={userName} />
          <LiveStatus monitoredTaxi={monitoredTaxi} onEndMonitoring={handleEndMonitoring} />
        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
};

const Loading: React.FC = () => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  }, [spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.loadingContainer}>
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <FontAwesome name="spinner" size={50} color="#003E7E" />
      </Animated.View>
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: 20,
    backgroundColor: '#F7F9FC',
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
    zIndex: 10,
  },
  navLogo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#003E7E',
  },
  container: {
    flex: 1,
  },
  toggleButton: {
    backgroundColor: 'transparent',
    padding: 10,
    borderRadius: 30,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: '#F7F9FC',
    paddingTop: 60,
    paddingHorizontal: 15,
    zIndex: 9,
    borderRightWidth: 1,
    borderRightColor: '#DDD',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#003E7E',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#003E7E',
  },
  sidebarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderRadius: 8,
    marginBottom: 10,
  },
  sidebarButtonText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#003E7E',
    fontWeight: '600',
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: '#DDD',
    marginVertical: 15,
  },
  mainContent: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
  },
  homeContent: {
    marginBottom: 30,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
  },
  customWidget: {
    backgroundColor: '#E8F0FE',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#003E7E',
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#003E7E',
  },
  liveStatus: {
    backgroundColor: '#F7F9FC',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 15,
  },
  taxiDetails: {
    marginLeft: 10,
  },
  taxiText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  estimateText: {
    fontWeight: 'bold',
    color: '#003E7E',
  },
  endMonitorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    padding: 10,
    borderRadius: 5,
    marginTop: 15,
  },
  endMonitorText: {
    color: '#FFF',
    marginLeft: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#003E7E',
  },
});

export default HomeScreen;