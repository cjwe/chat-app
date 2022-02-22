import React from 'react';
import { GiftedChat, Bubble, InputToolbar } from 'react-native-gifted-chat';
import { View, Platform, KeyboardAvoidingView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import CustomActions from './CustomActions';
import MapView from 'react-native-maps';
import * as firebase from 'firebase';
import 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyB6ZoEDQATnEGGACgOQ6ukQQQH9mF2lnEU',
  authDomain: 'chat-app-165a9.firebaseapp.com',
  projectId: 'chat-app-165a9',
  storageBucket: 'chat-app-165a9.appspot.com',
  messagingSenderId: '464769713030',
  appId: '1:464769713030:web:017fc12f1ff0f146cd2207',
  measurementId: 'G-084QMSEYVG',
};

export default class Chat extends React.Component {
  constructor() {
    super();
    this.state = {
      messages: [],
      uid: 0,
      user: {
        _id: '',
        name: '',
        avatar: '',
      },
      isConnected: false,
      image: null,
      location: null,
    };

    // Initialize Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    // Reference to the Firestore messages collection
    this.referenceChatMessages = firebase.firestore().collection('messages');
  }

  onCollectionUpdate = (querySnapshot) => {
    const messages = [];
    querySnapshot.forEach((doc) => {
      // Get the QueryDocumentSnapshot's data
      var data = doc.data();
      messages.push({
        _id: data._id,
        text: data.text,
        createdAt: data.createdAt.toDate(),
        user: {
          _id: data.user._id,
          name: data.user.name,
          avatar: data.user.avatar,
        },
        image: data.image || null,
        location: data.location || null,
      });
    });
    this.setState({
      messages: messages,
    });
    this.saveMessage();
  };

  // Retrieve messages from AsyncStorage
  getMessages = async () => {
    let messages = '';
    try {
      messages = (await AsyncStorage.getItem('messages')) || [];
      this.setState({
        messages: JSON.parse(messages),
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  // Save messages with asyncStorage
  saveMessage = async () => {
    try {
      await AsyncStorage.setItem(
        'messages',
        JSON.stringify(this.state.messages)
      );
    } catch (error) {
      console.log(error.message);
    }
  };

  // Delete messages from asyncStorage
  deleteMessages = async () => {
    try {
      await AsyncStorage.removeItem('messages');
      this.setState({
        messages: [],
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  componentDidMount() {
    let { name } = this.props.route.params;
    this.props.navigation.setOptions({ title: name });
    // Check the user connection status and fetch data from asyncStorage or Firestore
    NetInfo.fetch().then((connection) => {
      if (connection.isConnected) {
        // listens for updates in the collection
        this.unsubscribe = this.referenceChatMessages
          .orderBy('createdAt', 'desc')
          .onSnapshot(this.onCollectionUpdate);

        this.authUnsubscribe = firebase
          .auth()
          .onAuthStateChanged(async (user) => {
            if (!user) {
              return await firebase.auth().signInAnonymously();
            }
            this.setState({
              uid: user.uid,
              messages: [],
              user: {
                _id: user.uid,
                name: name,
                avatar: 'https://placeimg.com/140/140/any',
              },
              isConnected: true,
            });
          });
        this.saveMessage();
      } else {
        this.setState({ isConnected: false });
        // get saved messages from local AsyncStorage
        this.getMessages();
      }
    });
  }

  componentWillUnmount() {
    if (this.state.isConnected) {
      // Stop listening to authentication
      this.authUnsubscribe();
      // Stop listening for changes
      this.unsubscribe();
    }
  }

  addMessage() {
    const message = this.state.messages[0];
    // Add a new message to collection
    this.referenceChatMessages.add({
      _id: message._id,
      text: message.text || '',
      createdAt: message.createdAt,
      user: this.state.user,
      image: message.image || '',
      location: message.location || null,
    });
  }

  onSend(messages = []) {
    this.setState(
      (previousState) => ({
        messages: GiftedChat.append(previousState.messages, messages),
      }),
      () => {
        this.addMessage();
        this.saveMessage();
      }
    );
  }
  renderBubble(props) {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: '#33415c',
          },
          left: {
            backgroundColor: 'white',
          },
        }}
      />
    );
  }
  renderCustomView(props) {
    const { currentMessage } = props;
    if (currentMessage.location) {
      return (
        <MapView
          style={{ width: 150, height: 100, borderRadius: 13, margin: 3 }}
          region={{
            latitude: currentMessage.location.latitude,
            longitude: currentMessage.location.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        />
      );
    }
    return null;
  }
  renderInputToolbar(props) {
    if (this.state.isConnected == false) {
    } else {
      return <InputToolbar {...props} />;
    }
  }

  renderCustomActions = (props) => <CustomActions {...props} />;

  // Map view for location
  renderCustomView(props) {
    const { currentMessage } = props;
    if (currentMessage.location) {
      return (
        <MapView
          style={{ width: 150, height: 100, borderRadius: 13, margin: 3 }}
          region={{
            latitude: currentMessage.location.latitude,
            longitude: currentMessage.location.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        />
      );
    }
    return null;
  }

  render() {
    let name = this.props.route.params.name;
    this.props.navigation.setOptions({ title: name });

    let bgColor = this.props.route.params.bgColor;

    return (
      <View style={styles.container}>
        <View
          style={{ backgroundColor: bgColor, width: '100%', height: '100%' }}
        >
          <GiftedChat
            style={styles.giftedChat}
            renderBubble={this.renderBubble.bind(this)}
            renderInputToolbar={this.renderInputToolbar.bind(this)}
            renderActions={this.renderCustomActions}
            renderCustomView={this.renderCustomView}
            messages={this.state.messages}
            onSend={(messages) => this.onSend(messages)}
            user={{
              _id: this.state.user._id,
              name: this.state.name,
              avatar: this.state.user.avatar,
            }}
          />
          {Platform.OS === 'android' ? (
            <KeyboardAvoidingView behavior="height" />
          ) : null}
        </View>
      </View>
    );
  }
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  giftedChat: {
    color: '#000',
  },
});
