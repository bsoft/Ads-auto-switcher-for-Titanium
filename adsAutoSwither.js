/*
Ads Auto Switcher - ©BSoft&Co 2012
----------------------------------
v2.0.011

This script allows you to use both iAds and Admob at the same place within
a ©Titanium iOS project.

It works with ti.admob module (1.3) which can be found here :
https://github.com/appcelerator/titanium_modules/tree/master/admob/mobile/ios
or from Appcelerator Market Place.

For now, only iphone's screen size is managed, in portrait orientation (both iphone 5 and below).

Per default, Admob is always shown, while iAds is shown (on top of admob) and
hidden during some seconds.
The script manages to move or to resize an UI object when ads are visible.

Be carefull with admob when closing a window. The module ti.admob is not
really good to stop a refreshing admob.. :/
-------------------------------------------------------------------------------

How To use :
------------
// This adsAutoSwitcher prints the ads on top of a tableview object by moving it down
// The ads are delayed of 2sec
// ie : Before : tableview top = 0, height = 200, after : top = 50, height = 200
    var myAds = require ('modules/adsAutoSwither');
    var ads = new myAds();
    ads.setAdmobPublisherId('myAdmobKey');
    ads.setIadsShowHide('iAdsShowHide.Window');
    ads.setGlobalDelayStart(2000);
    ads.showAdvert(tableView,'move','top');

// Same as before, but now, the tableview is resized from its top
// ie : Before : tableview top = 0, height = 200, after : top = 50, height = 150
    [...]
    ads.showAdvert(tableView,'resize','top');

// Same as before, but now, the tableview is resized from its bottom
// ie : Before : tableview top = 0, height = 200, after : top = 0, height = 150
// so bottom is now 150
    [...]
    ads.showAdvert(tableView,'resize','bottom');

// Fixed banner at top = 120. No UI object resized or moved
    [...]
    ads.setAdsTopInit(120);
    ads.showAdvert(tableView,'','');
-------------------------------------------------------------------------------


-------------------------------------------------------------------------------
-------------------------------------------------------------------------------
Ads Auto Switcher is licensed under the Apache Public License (Version 2).
Please see the LICENSE file for the full license.
-------------------------------------------------------------------------------
-------------------------------------------------------------------------------
*/

Titanium.Admob = Ti.Admob;

function AdsAutoSwither() {
    /**
     *  Single contexte name of window
     *  Only use it if your application is a single context application. Then set here the instance of your window
     */
    var _singleContextWin = null;
    this.setSingleContextWin = function (name) {
        _singleContextWin = name;
    };

    /**
     *  Delay in ms before calling the ads
     */
    var _globalDelayStart = 0;
    this.setGlobalDelayStart = function (ms) {
        _globalDelayStart = ms;
    };

    /**
     *  Top margin (px) for the object to move
     */
    var _objMargin = 0;
    this.setObjMargin = function (px) {
        _objMargin = px;
    };

    /**
     *  To enabled or not admob. Don't forget to change ads.iadsStartDelay if no admob
     */
    var _useAdmob = true;
    this.setUseAdmob = function (b) {
        _useAdmob = b;
    };

    /**
     *  To enabled or not iAds.
     */
    var _useIads = true;
    this.setUseIads = function (b) {
        _useIads = b;
    };

    /**
     *  Milliseconds before starting iads
     */
    var _iadsStartDelay = 30000;
    this.setIadsStartDelay = function (ms) {
        _iadsStartDelay = ms;
    };

    /**
     *  Initial top position for the ads banners
     *  Set it to Ti.Platform.displayCaps.platformHeight + 50 for a bottom ad
     */
    var _adsTopInit = -50;
    this.setAdsTopInit = function (px) {
        _adsTopInit = px;
    };

    /**
     *  The event's name to be fired. It's recommanded to use one per ads's instance.
     */
    var _iAdsShowHide = 'iAdsShowHide';
    this.setIadsShowHide = function (str) {
        _iAdsShowHide = str;
    };

    /**
     *  Required : your admob id
     */
    var _admobPublisherId = null;
    this.setAdmobPublisherId = function (str) {
        _admobPublisherId = str;
    };

    // -- Admob extra parameters -- //
    /**
     *  Date of birth, to better target the ads, new Date(1985, 10, 1, 12, 1, 1)
     */
    var _adDateOfBirth = '';
    this.setAdDateOfBirth = function (d) {
        _adDateOfBirth = d;
    };

    /**
     *  Gender 'male' or 'female'
     */
    var _adGender  = '';
    this.setAdGender = function (g) {
        _adGender = g;
    };

    /**
     *  Keywords about the ads to print
     */
    var _adKeywords = '';
    this.setAdKeywords = function (k) {
        _adKeywords = k;
    };

    /**
     *  Test mode for admob
     */
    var _adTesting = false;
    this.setAdTesting = function (b) {
        _adTesting = b;
    };

    /**
     *  admob's backgroundColor
     */
    var _adBackgroundColor =  "#FDFEFD";
    this.setAdBackgroundColor = function (c) {
        _adBackgroundColor = c;
    };

    // --   iAds extra public parameters     -- //
    /**
     *  iAds's border color
     */
    var _iAdsBorderColor = '#FDFEFD';
    this.setIAdsBorderColor = function (c) {
        _iAdsBorderColor = c;
    };

    /**
     *  iAds's backgroundColor
     */
    var _iAdsBackgroundColor = '#FDFEFD';
    this.setIAdsBackgroundColor = function (c) {
        _iAdsBackgroundColor = c;
    };

    /**
     *  How long iAd stay visible (milliseconds)
     */
    var _iAdsTimeToShow = 30000;//15000;
    this.setIAdsTimeToShow = function (ms) {
        _iAdsTimeToShow = ms;
    };

    /**
     *  How long iAd is hidden (milliseconds)
     */
    //this.iAdsTimeToHide = 30000;
    
    /**
     *  Public methods to expose the actual iAds/Admob visibility
     */
    var _iAdsVisible = false;
    this.getIadsVisible = function () {
        return _iAdsVisible;
    };

    var _adMobVisible = false;
    this.getAdMobVisible = function () {
        return _adMobVisible;
    };

    // --   Private members     -- //
    /**
     *  The UI object to be moved/resized when an ad is visible
     */
    var _objUI = {};

    /**
     *  The type of transformation for the object, can be : 'move' or 'resize' or '' (empty for fixed banner)
     */
    var _alterFrom = '';
    
    /**
     *  From where the object transformation should start : 'top' or 'bottom'
     */
    var _alterType = '';
    
    /**
     *  Top, bottom and height for the objUI
     */
    var _objUIinitTop, _objUIinitBottom, _objUIinitHeight;
    var _admob = null, _iads = null;
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
    var _hideExtraAdsSpace = function () {
        if (_alterType === 'move') {
            if (_alterFrom === 'top') {
                _objUI.animate({top: _objUIinitTop + _objMargin, duration: 250});
            } else { // TO CHECK ( - adsmargin?)
                _objUI.animate({bottom: _objUIinitBottom + _objMargin, duration: 250 });
            }
        } else {
            if (_alterFrom === 'top') {
                _objUI.animate({height: _objUIinitHeight, top: _objUIinitTop, duration: 250});
            } else {
                _objUI.animate({height: _objUIinitHeight, bottom: _objUIinitBottom, duration: 250});
            }
        }
    };
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
    var _buildIads = function () {
        var firstRun = true;
        if (parseFloat(Titanium.Platform.version) >= 3.2) {
            Ti.API.debug('ads.showiAds - build iads; this.iAdsTimeToShow:' + _iAdsTimeToShow);
            _iads = Ti.UI.iOS.createAdView({
                width: Ti.UI.SIZE || 'auto',
                height: Ti.UI.SIZE || 'auto',
                top: _adsTopInit,
                borderColor: _iAdsBorderColor,
                backgroundColor: _iAdsBackgroundColor
            });
            _iads.addEventListener('load', function () {
                Ti.API.debug("ads.showiAds - iads loaded. First Run ? :" + firstRun);
                _iAdsVisible = true;
                if (firstRun) {
                    Ti.API.debug("ads.showiAds - First iAds run : True");
                    firstRun = false;
                } else {
                    Ti.API.debug("ads.showiAds - First iAds run ? : False");
                }
                timer = setInterval(function () {_showIads(); }, _iAdsTimeToShow);
            });
            _iads.addEventListener('error', function (e) {
                Ti.API.debug("ads.showiAds - iads error :" + e.message + " --- adMobVisible=" + _adMobVisible);
                if (_iAdsVisible &&  _alterType !== '') {
                    if (_adMobVisible) {
                        if (_alterType === 'move') {
                            if (_alterFrom === 'top') {
                                _objUI.animate({top: _objUIinitTop + 50 + _objMargin, duration: 250});
                            } else { // TO CHECK ( - adsmargin?)
                                _objUI.animate({bottom: _objUIinitBottom + 50 + _objMargin, duration: 250});
                            }
                        } else {
                            if (_alterFrom === 'top') {
                                _objUI.animate({height: _objUIinitHeight - 50, top: _objUIinitTop + 50 + _objMargin, duration: 250});
                            } else {
                                _objUI.animate({height: _objUIinitHeight - 50, bottom: _objUIinitBottom - 53, duration: 250});
                            }
                        }
                    } else { // hide the extra space for ads
                        _hideExtraAdsSpace();
                    }
                }
                _iads.top = _adsTopInit;
                _iAdsVisible = false;
            });
            try {
                Titanium.UI.currentWindow.add(_iads);
            } catch (e) {
                _singleContextWin.add(_iads);
            }
        }
    };
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
    var _showIads = function () {
        Ti.API.debug("ads.showiAds - Receive iAdsShowHide. ads.iAdsVisible :" + _iAdsVisible + " -- iads.visible: " + _iads.visible + " -- ads.adMobVisible: " + _adMobVisible);
        if (_iAdsVisible && _iads.visible) {
            if (_adMobVisible === false) {
                // if admob's not visible, let iAds on screen
            } else { // to hide iAds
                _iads.animate({top: _adsTopInit, duration: 500}, function () { _iads.hide(); Ti.API.debug("ads.showiAds - hide iads"); });
            }
        } else { // to show iAds
            if (_adMobVisible === false && _alterType !== '') {
                if (_alterType === 'move') {
                    if (_alterFrom === 'top') {
                        _objUI.animate({top: _objUIinitTop + 50 + _objMargin, duration: 250});
                    } else { // TO CHECK ( - adsmargin?)
                        _objUI.animate({bottom: _objUIinitBottom + 50 + _objMargin, duration: 250});
                    }
                } else {
                    if (_alterFrom === 'top') {
                        _objUI.animate({height: _objUIinitHeight - 50, top: _objUIinitTop + 50 + _objMargin, duration: 250});
                    } else {
                        _objUI.animate({height: _objUIinitHeight - 58, bottom: _objUIinitBottom - 58, duration: 250});
                    }
                }
            }
            _iads.show();
            Ti.API.debug("ads.showiAds - iads show");
            if (_alterFrom === 'top') {
                _iads.animate({top: _objUIinitTop, duration: 500, curve: Ti.UI.ANIMATION_CURVE_EASE_IN_OUT});
            } else if (_alterFrom === 'bottom') {
                _iads.animate({top: _objUIinitBottom - 54, duration: 500, curve: Ti.UI.ANIMATION_CURVE_EASE_IN_OUT});
            }
        }
    };
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
    var _buildAdmob = function () {
        if (_admob === null) {
            Ti.API.debug("ads.buildAdmob - try buildAdmob - this.adTesting" + _adTesting);
            _admob = Ti.Admob.createView({
                publisherId: _admobPublisherId, // required
                top: _adsTopInit,
                left: 0,
                width: Ti.Platform.displayCaps.getPlatformWidth(), //320, // required
                height: 50, // required
                testing: _adTesting,
                adBackgroundColor: _adBackgroundColor,
                dateOfBirth: _adDateOfBirth, //new Date(1985, 10, 1, 12, 1, 1),
                gender: _adGender, //'male',
                keywords: _adKeywords, //'',
                refreshAd: 15.0 //not working with actual ti.admob module (1.3), set refresh time within admob site
            });
            _admob.addEventListener('didFailToReceiveAd', function () {
                _admob.top = _adsTopInit;
                _admob = null;
                if (!_iAdsVisible && _alterType !== '') {
                    _hideExtraAdsSpace();
                }
                _adMobVisible = false;
                setTimeout(_buildAdmob, 10000);
                Ti.API.debug("ads.buildAdmob - admob error : didFailToReceiveAd. Retry in 10s. adMobVisible:" + _adMobVisible);
            });
            _admob.addEventListener('didReceiveAd', function () {
                Ti.API.debug("ads.buildAdmob - admob event : didReceiveAd");
                _showAdmob();
            });
            try {
                Titanium.UI.currentWindow.add(_admob);
            } catch (e) {
                _singleContextWin.add(_admob);
            }
        }
    };
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
    var _showAdmob = function () {
        if (_adMobVisible === false) {
            try {
                if (!_iAdsVisible && _alterType !== '') {
                    if (_alterType === 'move') {
                        if (_alterFrom === 'top') {
                            _objUI.animate({top: _objUIinitTop + 50 + _objMargin, duration: 250});
                        } else { // TO CHECK ( - adsmargin?)
                            _objUI.animate({bottom: _objUIinitBottom + 50 + _objMargin, duration: 250});
                        }
                    } else {
                        if (_alterFrom === 'top') {
                            _objUI.animate({height: _objUIinitHeight - 50, top: _objUIinitTop + 50 + _objMargin, duration: 250});
                        } else {
                            _objUI.animate({height: _objUIinitHeight - 58, bottom: _objUIinitBottom - 58, duration: 250});
                        }
                    }
                }
                _adMobVisible = true;
                if (_alterFrom === 'top') {
                    _admob.animate({top: _objUIinitTop, duration: 500, curve: Ti.UI.ANIMATION_CURVE_EASE_IN_OUT});
                } else if (_alterFrom === 'bottom') {
                    _admob.animate({top: _objUIinitBottom - 58, duration: 500, curve: Ti.UI.ANIMATION_CURVE_EASE_IN_OUT});
                }
            } catch (e) {
                _adMobVisible = false;
                Ti.API.debug("ads.showAdmob - catch admob error showAdmob");
                setTimeout(_buildAdmob, 10000);
            }
        }
    };
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
    /**
     *  showAdvert  : the unique function to call to start showing the ads
     *  objUI       : the object to move or resize.
     *  alterType   : The type of transformation for the object, can be : 'move' or 'resize' or '' (empty for a fixed banner)
     *  alterFrom   : From where the object transformation should start : 'top' or 'bottom' of the objUI
     */
    this.showAdvert = function (objUI, alterType, alterFrom) {
        if (Titanium.Network.online) {
            _objUI = objUI;
            _alterFrom = alterFrom;
            _alterType = alterType;

            var postLayoutCallback  = function (e, AdsAutoSwither) {
                _objUI.removeEventListener('postlayout', postLayoutCallback);
                _objUIinitTop = objUI.getTop(); _objUIinitBottom = objUI.rect.bottom; _objUIinitHeight = objUI.rect.height;
                if (_objUIinitTop == 'undefined') {
//                    _objUIinitTop = _objUIinitBottom - _objUIinitHeight - 50;
                }
                Ti.API.debug('_objMargin:' + _objMargin + ' -- _objUIinitTop :' + _objUIinitTop + ' -- _objUIinitBottom :' + _objUIinitBottom + ' -- _objUIinitHeight :' + _objUIinitHeight);
                setTimeout(function () {
                    if (_useAdmob) {
                        Ti.Admob = require('ti.admob');
                        _buildAdmob();
                    }
                    if (_useIads) { setTimeout(_buildIads, _iadsStartDelay); }
                }, _globalDelayStart);
            };
            _objUI.addEventListener('postlayout', postLayoutCallback);
        }
        else { // No internet connection. Retry in 30sec
            setTimeout(this.showAdvert, 30000);
        }
    };
}
module.exports = AdsAutoSwither;