import React from 'react';
import {
  GiftedChat,
  Day,
  SystemMessage,
  Bubble,
} from 'react-native-gifted-chat';
import { View, Platform, KeyboardAvoidingView, StyleSheet } from 'react-native';
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
    };

    //initializing firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    // reference to the Firestore messages collection
    this.referenceChatMessages = firebase.firestore().collection('messages');
    this.refMsgsUser = null;
  }

  componentDidMount() {
    let { name } = this.props.route.params;

    // Authenticate user
    this.authUnsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
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
      // Listen for updates
      this.unsubscribe = this.referenceChatMessages
        .orderBy('createdAt', 'desc')
        .onSnapshot(this.onCollectionUpdate);
    });
    this.setState({
      messages: [
        {
          _id: 1,
          text: 'Hello, developer!',
          createdAt: new Date(),
          user: {
            _id: 2,
            name: 'React Native',
            avatar: 'https://placeimg.com/140/140/any',
          },
        },
        {
          _id: 2,
          text: `${name} has entered the chat`,
          createdAt: new Date(),
          system: true,
        },
      ],
    });
  }
  // Add message to state
  onSend(messages = []) {
    this.setState(
      (previousState) => ({
        messages: GiftedChat.append(previousState.messages, messages),
      }),
      () => {
        this.addMessages();
      }
    );
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
  };

  componentWillUnmount() {
    //unsubscribe from collection updates
    this.authUnsubscribe();
    this.unsubscribe();
  }

  // changes for system messages
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

  // day message
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

  render() {
    let bgColor = this.props.route.params.bgColor;

    return (
      <View style={styles.container}>
        <View style={{ ...styles.container, backgroundColor: bgColor }}>
          <GiftedChat
            renderBubble={this.renderBubble.bind(this)}
            renderDay={this.renderDay.bind(this)}
            renderSystemMessage={this.renderSystemMessage.bind(this)}
            messages={this.state.messages}
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
