
import React, { Component, PropTypes } from 'react';

import I18n from 'react-native-i18n';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

import NavigationBar from './navigationBar';
import StickyHeader from './stickyHeader';

import { renderItem } from './grid';
import AmenitiesItem from './amenitiesItem';
import TourStop from '../containers/tourStop';

import { BOTTOMBARHEIGHT } from './rootScreen';
import { BOTTOMPLAYERHEIGHT } from './bottomPlayer';
import { TAB_NEARME } from '../actions/navigation';
import { PLAYER_STATUS_PLAY } from '../actions/audio';

import BluetoothButton from './buttons/bluetoothButton';
import LocationServicesButton from './buttons/locationServicesButton';

import {
   screenReaderScreenChanged,
 } from '../actions/accessibility';

import {
    analyticsTrackBeaconRegion,
  } from '../actions/analytics';

import { globalStyles, TEAL, OFF_BLACK, LIGHT_BLUE, LIGHT_GRAY } from '../styles';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    marginTop: 65,
    marginBottom: 100,
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: LIGHT_GRAY,
  },
  messageContainer: {
    flex: 1,
    marginHorizontal: 10,
    paddingTop: 25,
    paddingBottom: 15,
  },
  buttonsContainer: {
    marginTop: 15,
  },
  settingContainer: {
    paddingTop: 10,
    paddingLeft: 10,
    paddingRight: 10,
    paddingBottom: 10,
  },
});

// I tried to do this through state but couldn't...
let lastSeenNumber = 0;

class NearMeScreen extends Component {
  static title = I18n.t('nearMeScreen_Title');

  static propTypes = {
    navigator: PropTypes.object.isRequired,
    playerOpen: PropTypes.bool.isRequired,
    closeTourStops: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.object,
    ]).isRequired,
    regions: PropTypes.array.isRequired,
    amenities: PropTypes.array.isRequired,
    timerActive: PropTypes.bool.isRequired,
    activeTab: PropTypes.string.isRequired,
    screenReader: PropTypes.bool.isRequired,
    atNearMeRoot: PropTypes.bool.isRequired,
    playerStatus: PropTypes.string.isRequired,
    currentStopUUID: PropTypes.string.isRequired,
    floor: PropTypes.string,
    tracking: PropTypes.bool,
    bluetoothOn: PropTypes.bool.isRequired,
    locationServicesStatus: PropTypes.string.isRequired,
    locale: PropTypes.string.isRequired,
  }

  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.activeTab === TAB_NEARME && nextProps.atNearMeRoot;
  }

  render() {
    const tourStops = this.props.closeTourStops;
    const tourStopsNum = tourStops.length;

    let contentView;
    let debugView;

    if (this.props.tracking === false) {
      contentView = (
        <View style={[styles.messageContainer, styles.settingContainer]}>
          <Text style={globalStyles.body}>
            {'While at the museum, we show you themes based on what’s near you.'
             + '\n\n' +
            'To use this feature, we’ll need two things from you…'}
          </Text>
          <View style={styles.buttonsContainer}>
            <LocationServicesButton
              locationServicesStatus={this.props.locationServicesStatus}
            />
            <BluetoothButton
              bluetoothOn={this.props.bluetoothOn}
            />
          </View>
        </View>
      );
    } else if (this.props.tracking === true) {
      let storiesMessage;

      if (this.props.floor !== null) {
        if (tourStopsNum === 0) {
          storiesMessage = 'There are no themes near you.';
        } else if (tourStopsNum === 1) {
          storiesMessage = 'There is one theme near you.';
        } else {
          storiesMessage = `There are ${tourStopsNum} themes near you.`;
        }
      }

      // Only announce changes when:
      // 1. The Near Me Tab is active
      // 2. The navigator is at the root view
      // 3. The number of stops has changed
      // 4. The autoplay timer is not active
      // 5. The player is not currently playing
      if (this.props.activeTab === TAB_NEARME &&
          this.props.atNearMeRoot &&
          lastSeenNumber !== tourStopsNum &&
          !this.props.timerActive &&
          this.props.playerStatus !== PLAYER_STATUS_PLAY
      ) {
        lastSeenNumber = tourStopsNum;
        if (storiesMessage) {
          screenReaderScreenChanged(storiesMessage);
        }
      }

      const regionsDetected = this.props.regions ? this.props.regions.join(', ') : '';

      if (regionsDetected) {
        analyticsTrackBeaconRegion(regionsDetected);

        if (__DEV__) {
          debugView = (
            <View
              style={{
                height: 25,
                backgroundColor: LIGHT_BLUE,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  textAlign: 'center',
                }}
              >
                {`Regions: ${regionsDetected}`}
              </Text>
            </View>
          );
        }
      }

      const stickyHeaders = [];
      let totalIndex = 0;

      let tourStopsList = tourStops.map((tourStop, index) => {
        totalIndex++;
        return renderItem(
          tourStop,
          index,
          (item) => {
            this.props.navigator.push({
              title: tourStop.shortTitle,
              component: TourStop,
              barTintColor: '#ffffff',
              tintColor: TEAL,
              titleTextColor: OFF_BLACK,
              shadowHidden: true,
              navigationBarHidden: true,
              passProps: {
                tourStop,
                tab: TAB_NEARME,
                floor: tourStop.floor,
                duration: tourStop.duration[this.props.locale],
                initialCategory: tourStop.initialAudio,
                imageURL: tourStop.imageURL,
              },
            });
          },
          this.props.currentStopUUID,
          this.props.locale,
          tourStops,
        );
      });

      if (tourStopsList.length > 0) {
        totalIndex++;
        stickyHeaders.push(0);
        tourStopsList.unshift(
          <StickyHeader
            key={totalIndex}
            title={'Themes'}
          />
        );
      }

      let amenitiesList = this.props.amenities.map((amenity, index) => {
        totalIndex++;
        return (
          <AmenitiesItem
            key={totalIndex}
            amenity={amenity}
            border={index !== (this.props.amenities.length - 1)}
          />
        );
      });

      if (amenitiesList.length > 0) {
        totalIndex++;
        stickyHeaders.push(tourStops.length + 1);
        amenitiesList.unshift(
          <StickyHeader
            key={totalIndex}
            title={'Amenities'}
          />
        );
      }

      contentView = (
        <ScrollView
          automaticallyAdjustContentInsets={false}
          stickyHeaderIndices={stickyHeaders}
        >
          {tourStopsList}
          {amenitiesList}
        </ScrollView>
      );
    }

    let floor;
    if (this.props.floor === null) {
      floor = I18n.t('nearMeScreen_Title');
    } else {
      floor = `${I18n.t('floor')} ${this.props.floor}`;
    }

    let containerMargin = BOTTOMBARHEIGHT;
    if (this.props.playerOpen) {
      containerMargin = BOTTOMPLAYERHEIGHT + BOTTOMBARHEIGHT;
    }

    return (
      <View style={{ flex: 1 }}>
        <View style={styles.statusBar} />
        <NavigationBar
          label={floor}
          labelStyle={{
            color: OFF_BLACK,
          }}
          barStyle={{
            backgroundColor: LIGHT_GRAY,
            height: 44,
          }}
        />
        <View
          style={[styles.container, { marginBottom: containerMargin }]}
        >
          {debugView}
          {contentView}
        </View>
      </View>
    );
  }
}

export default NearMeScreen;
