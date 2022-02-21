import React from 'react';
import {
  GiftedChat,
  Day,
  SystemMessage,
  Bubble,
  InputToolbar,
} from 'react-native-gifted-chat';
import { View, Platform, KeyboardAvoidingView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

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
      uuid: 0,
      user: {
        _id: '',
        name: '',
        avatar: '',
      },
      isConnected: false,
    };

    //initializing firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    // reference to the Firestore messages collection
    this.referenceChatMessages = firebase.firestore().collection('messages');
    this.refMsgsUser = null;
  }

  // Async, get messages
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

  // Async, save messages
  saveMessages = async () => {
    try {
      await AsyncStorage.setItem(
        'messages',
        JSON.stringify(this.state.messages)
      );
    } catch (error) {
      console.log(error.message);
    }
  };
  // Async, delete messages
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
    // Add name to header
    this.props.navigation.setOptions({ title: name });

    this.getMessages();

    // Check online status
    NetInfo.fetch().then((connection) => {
      if (connection.isConnected) {
        this.setState({ isConnected: true });
        console.log('online');
        // listen for updates in the collection
        this.unsubscribe = this.referenceChatMessages
          .orderBy('createdAt', 'desc')
          .onSnapshot(this.onCollectionUpdate);

        // Authenticate user
        this.authUnsubscribe = firebase
          .auth()
          .onAuthStateChanged(async (user) => {
            if (!user) {
              await firebase.auth().signInAnonymously();
            }

            // Update state with signed in user
            this.setState({
              uid: user.uid,
              messages: [],
              user: {
                _id: user.uid,
                name: name,
                avatar: 'https://placeimg.com/140/140/any',
              },
            });
            // Access stored messages of current user
            this.refMsgsUser = firebase
              .firestore()
              .collection('messages')
              .where('uid', '==', this.state.uid);
          });
        // save messages locally to AsyncStorage when online
        this.saveMessages();
      } else {
        // If the user is offline...
        this.setState({ isConnected: false });
        console.log('offline');
        // retrieve messages from asyncstorage
        this.getMessages();
      }
    });
  }

  //Add message to database
  addMessages() {
    const message = this.state.messages[0];
    // add a new messages to the collection
    this.referenceChatMessages.add({
      _id: message._id,
      text: message.text || '',
      createdAt: message.createdAt,
      user: this.state.user,
    });
  }

  // On update, sets the messages' state with the current data
  onCollectionUpdate = (querySnapshot) => {
    const messages = [];
    // go through each document
    querySnapshot.forEach((doc) => {
      // get the QueryDocumentSnapshot's data
      let data = doc.data();
      messages.push({
        _id: data._id,
        text: data.text,
        createdAt: data.createdAt.toDate(),
        user: {
          _id: data.user._id,
          name: data.user.name,
          avatar: data.user.avatar,
        },
      });
    });
    this.setState({
      messages: messages,
    });
    this.saveMessages();
  };

  componentWillUnmount() {
    if (this.state.isConnected) {
      // stop listening to authentication
      this.authUnsubscribe();
      // stop listening for changes
      this.unsubscribe();
    }
  }
  // Add message to state
  onSend(messages = []) {
    this.setState(
      (previousState) => ({
        messages: GiftedChat.append(previousState.messages, messages),
      }),
      () => {
        this.saveMessages();
        this.addMessages();
      }
    );
  }
  // Change user chat bubble color
  renderBubble(props) {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: '#000',
          },
        }}
      />
    );
  }

  // Change system messages
  renderSystemMessage(props) {
    return (
      <SystemMessage
        {...props}
        textStyle={{
          color: '#fff',
        }}
      />
    );
  }

  // Change day messages
  renderDay(props) {
    return (
      <Day
        {...props}
        textStyle={{
          color: '#fff',
        }}
      />
    );
  }

  // Remove input chat bar if user is offline
  renderInputToolbar(props) {
    if (this.state.isConnected == false) {
    } else {
      return <InputToolbar {...props} />;
    }
  }

  render() {
    // Set background to user selected color
    let bgColor = this.props.route.params.bgColor;
    return (
      <View style={styles.container}>
        <View style={{ ...styles.container, backgroundColor: bgColor }}>
          <GiftedChat
            renderBubble={this.renderBubble.bind(this)}
            renderDay={this.renderDay.bind(this)}
            renderSystemMessage={this.renderSystemMessage.bind(this)}
            messages={this.state.messages}
            renderInputToolbar={this.renderInputToolbar.bind(this)}
            onSend={(messages) => this.onSend(messages)}
            user={{
              _id: this.state.user._id,
              name: this.state.user.name,
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
  },
});
