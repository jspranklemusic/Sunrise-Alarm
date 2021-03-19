import React, {useState,useEffect} from 'react';
import checkObserved from './scripts/DST'
import * as Notifications from 'expo-notifications'
import { Audio } from 'expo-av';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Provider,  useSelector, useDispatch } from 'react-redux';
import {Modal, Dimensions, Alert, StyleSheet, Image, ToastAndroid, Text, Vibration, View, Switch, Pressable, TouchableOpacity, TouchableHighlight, SafeAreaView, ScrollView, Button, TextInput, AsyncStorage } from 'react-native';


const FETCHCOORDS = "FetchCoords"

let linkUpdate = function(){};

TaskManager.defineTask(FETCHCOORDS, () => {
    try {
      linkUpdate();
      const receivedNewData = null;
      return receivedNewData ? BackgroundFetch.Result.NewData : BackgroundFetch.Result.NoData;
    } catch (error) {
      return BackgroundFetch.Result.Failed;
    }
  });

export default function AppContent(){
     Audio.setAudioModeAsync({
    staysActiveInBackground:true,
  })


  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound:false,
      shouldSetBadge: true,
    }),
  });

  async function playSound() {
    console.log('Loading Sound');
    const { sound } = await Audio.Sound.createAsync(
       require('./assets/08_Here-Is-Love.wav')
    );
    setSound(sound);
    console.log('Playing Sound');
    await sound.playAsync(); 
  }
  

  



  const [subscription, setSubscription] = useState(null)
  const [notification, setNotification] = useState(null);
  const [sound, setSound] = React.useState();
  const [latLong, setLatLong] = useState(null);
  const [address, setAddress] = useState({});
  const [sunriseTime, setSunriseTime] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [secsTillAlarm, setSecsTillAlarm] = useState(0)

  
  function setAlarm(){
      
    if(!notification){
        let newTimeSecs = ( new Date(sunriseTime).getTime() - Date.now())/1000
        setNotification(Notifications.scheduleNotificationAsync({
          identifier: 'alarm',
          content: {
            title: "Time to get up!",
            body: 'Good morning, the sun has risen.',
          },
          trigger: {
            seconds:10
          },
        }));
      }
  }

  function cancelAlarm(){
    Notifications.cancelScheduledNotificationAsync('alarm');
    setNotification(null)
  }

  const toggleSwitch = () => {
    //isEnabled is the previous state, this function is what it changes to.
    let message;
    if(isEnabled){
      message = "Alarm is disabled."
      cancelAlarm();

    }else{
      message = "Alarm is enabled."
      setAlarm();
      
    }
    ToastAndroid.show(message, ToastAndroid.SHORT);
    setIsEnabled(previousState => !previousState);
  };

  

 

  //functions

  async function getPosFromCoords(lat,long){
    const response = await fetch(`http://api.positionstack.com/v1/reverse?access_key=cc77500dc06d009d06d00111e9c6602b&query=${lat},${long}`)
    const data = await response.json()
    setAddress(data.data[0])
  };


  async function getSunrise(lat,long){

    var today = new Date()
    var tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow = tomorrow.getFullYear()+"-"+(tomorrow.getMonth()+1)+"-"+tomorrow.getDate()
    


    const response = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${long}&date=${tomorrow}&formatted=0
    `);
    const data = await response.json();
    // const locale = new Date(data.results.sunrise).toLocaleTimeString();
    const locale = data.results.sunrise;
    console.log(locale)
    setSunriseTime(locale)
  }

  function setCoordStates(latitude,longitude){
    if(longitude && latitude) {
      setLatLong([latitude,longitude]); 
      getPosFromCoords(latitude,longitude);
      getSunrise(latitude,longitude);
      }
  }
  
  
  const checkLocationInStorage = async ()=>{
    const longitude = await AsyncStorage.getItem('longitude');
    const latitude = await AsyncStorage.getItem('latitude');
    if(longitude && latitude){
      setCoordStates(latitude,longitude);
    }else{
      findCoordinates();
    }
    
  }

  const findCoordinates = async () => {
    
		navigator.geolocation.getCurrentPosition(
			position => {
        setCoordStates(position.coords.latitude,position.coords.longitude)
        AsyncStorage.setItem('longitude',position.coords.longitude.toString());
        AsyncStorage.setItem('latitude',position.coords.latitude.toString());
			},
			error => Alert.alert(error.message),
			{ enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
		);
  };



 
//use effects

  useEffect( ()=>{
    linkUpdate = function(){
        console.log("SECONDS TILL TODAY'S SUNSET ALARM: ",( new Date(sunriseTime).getTime() - Date.now())/1000)

    }
    linkUpdate();

    //ON START, CHECKS FOR LOCATION
    checkLocationInStorage();

    if(!subscription){
      //EVENT LISTENER FOR NOTIFICATION/ALARM:
      setSubscription(Notifications.addNotificationReceivedListener(notification => {
        setModalVisible(true);
        playSound()
      }));
    }

    BackgroundFetch.registerTaskAsync(FETCHCOORDS, {
      startOnBoot:true,
      minimumInterval:1
    })
  },[])










  
  return (
    <React.Fragment>
          <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={async () => {
          Alert.alert("Alarm has been silenced.");
          await sound.unloadAsync()
          setModalVisible(!modalVisible);
          setAlarm();
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Good morning!</Text>
            <Pressable
              style={[styles.button, styles.buttonClose]}
              onPress={async () => {
                await sound.unloadAsync()
                return setModalVisible(!modalVisible)
              }}
            >
              <Text style={styles.textStyle}>Turn Off Alarm</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    <View style={styles.header}></View>
    <View style={styles.container}>
      <Image style={styles.image} source={require('./assets/sunrise.png')}></Image>
      <Text style={styles.heading}>Sunrise Alarm</Text>
    {address.locality ? <Text style={{width:'100%',textAlign:'center'}}>{address.label}</Text> : null}
    {!address.locality ? <Text style={{width:'100%',textAlign:'center'}}>Check your location for accurate results.</Text> : null}

      
      {sunriseTime ? 
        <View style={{position:'relative'}}>
            <Text style={{position:'absolute',color:'rgba(0,0,0,0.2)', right: 0, fontWeight:'bold', top:'22.5%', left:'0%', textAlign:'center'}}>Tomorrow's Sunrise - {new Date(sunriseTime).toLocaleDateString()}</Text>
            <Text style={styles.sunriseText}>
                {new Date(sunriseTime).toLocaleTimeString()} AM
            </Text>               
        </View> : null}

      
      
      {/* <Button title="Play Sound" onPress={playSound} />
      <Button title="STOP Sound" onPress={async()=>await sound.unloadAsync()} /> */}
      {isEnabled ? <Text style={{fontSize:30,color:'black'}}>Alarm On</Text> : <Text style={{fontSize:30,color:'rgba(0,0,0,0.2)'}}>Alarm Off</Text>}
      
      <Switch
        trackColor={{ false: "#767577", true: "#81b0ff" }}
        thumbColor={"#f4f3f4"}
        ios_backgroundColor="#3e3e3e"
        onValueChange={toggleSwitch}
        value={isEnabled}
        style={{marginBottom:20}}
      />
      <Button onPress={()=>{Vibration.vibrate(100, false); return findCoordinates()}} title={"Get Location"}></Button>
    </View>
    <View style={styles.footer}>

    </View>

    </React.Fragment>
  );
}










const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent:'flex-start'
    
  },
  textinput:{
    borderColor:"rgba(200,200,200,0.500)",
    borderStyle:'solid',
    borderWidth:1,
    padding:5,
    paddingHorizontal:15,
    borderRadius:5,
    marginTop:20
  },
  heading:{
    fontSize:30,
    fontWeight:"500"
  },
  sunriseText:{
    marginVertical:40,
    backgroundColor:'rgba(0, 126, 250, 0.3)',
    borderRadius:5,
    borderRadius:25,
    padding:30,
    fontSize:40,
    position:"relative",
    textAlign:'center',
    color:'rgb(75,75,75)',
    // fontWeight:'bold',
  },
  image: {
    width: '50%',
    height:'25%',
    marginTop:70,
    resizeMode: 'contain',
    margin:0,

  },
  footer:{
    position:'absolute',
    bottom:0,
    height:80,
    width:'100%',
    zIndex:0,
    backgroundColor:'orange',
    borderTopColor:'rgba(100,20,0,0.10)',
    borderTopWidth:5
    
    
  },
  modalView: {
    backgroundColor: "rgba(0,0,0,.850)",
    padding: 35,
    alignItems: "center",
    justifyContent:'center',
    shadowColor: "#000",
    height:'100%',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  button: {
    borderRadius: 20,
    paddingHorizontal:30,
    paddingVertical:10,
    elevation: 2
  },
  buttonOpen: {
    backgroundColor: "orange",
  },
  buttonClose: {
    backgroundColor: "orange",
  },
  textStyle: {
    color: "black",
    fontWeight: "bold",
    textAlign: "center"
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    color:'white',
    fontSize:30
  }
 

})