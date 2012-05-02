/*
Ads Auto Switcher - ©BSoft&Co 2012
----------------------------------

This script allows you to use both iAds and Admob at the same place within
a ©Titanium iOS project.

It works with ti.admob module (1.2) which can be found here :
https://github.com/appcelerator/titanium_modules/tree/master/admob/mobile/ios

For now, only iphone's screen size is managed, in portrait orientation.

Per default, Admob is always shown, while iAds is shown (on top of admob) and 
hidden during some seconds.
The script manages to move or to resize an UI object when ads are visible.

Be carefull with admob when closing a window. The module ti.admob is not 
really good to stop a refreshing admob.. :/
-------------------------------------------------------------------------------


history:
--------
v1.24.01
    + Change 'auto' size for iAds to Ti.UI.SIZE to be ready with Ti sdk 2
    ± Only load ti.admob if needed
v1.23
    + Now compatible with ti.admob >= 1.2
    + Add the values 'adDateOfBirth', 'adGender', 'adKeywords' and 'adTesting' for admob
    + Add the possibility to use or not iAds, like useAdmob : ads.useIads
v1.22
    - delete 'adDelay' parameter
v1.21
    + ads.typeMove = '' for fixed ads. Set ads.obj2Move = null
V1.2
    + ads.useAdmob = true/false : to enabled or not admob. If false, only iAds 
    is shown
-------------------------------------------------------------------------------
-------------------------------------------------------------------------------


How To use : 
------------
Ti.include('ads.js');
ads.admobPublisherId = 'myadmobKey'; 
ads.iAdsShowHide = "iAdsShowHide.xx";
ads.init(tableViewObj,0,0,'top');
// --> This inits an ad positionned at top = 0. The tableview name tableViewObj 
// will be moved down at top = 50 when an ad is visible.
ads.showAdvert();
//setTimeout(ads.showAdvert, 2000);    
-------------------------------------------------------------------------------
-------------------------------------------------------------------------------



-------------------------------------------------------------------------------
Ads Auto Switcher is licensed under the Apache Public License (Version 2). 
Please see the LICENSE file for the full license.

*/

Titanium.Admob = Ti.Admob;
/*
//iads size 320,50 // 480,32 // ipad : 768,66 // 1024,66
// Size for the ads to print
var adSize = [{w:320,h:50},{w:300,h:250},{w:468,h:60},{w:728,h:90}];


*/
var ads = {};
(function() {
    // The object to be moved/resized when an ad is visible
    ads.obj2Move = {}; 
    // Top position (px) of the object when no ads on screen (typeMove = 'top')
    // || Top ads position (typeMove = 'height')
    ads.topPos = 0; 
    // Max height (px) for the object when no ads (don't mind when typeMove = 'top'
    ads.objHmax = 460; 
    // Top margin (px) for the object to move (optional)
    ads.objMargin = 0; 
    // Type of move for the object (top/height/''). 
    // - top : To move the top position of the object
    // - height : To resize the height of the object.
    //     /|\ : If the position of the object to resized is defined with TOP, the object will be resized from its bottom.
    //         Its TOP position stay fixed!
    //         So to resized the object from the top, with a fxed bottom position, it should be defined with bottom position.   
    // - '' : To have a fixed ads position. (If so, also set obj2Move = null)
    ads.typeMove = 'top'; 
    // To enabled or not admob. Don't forget to change ads.iadsStartDelay if no admob
    ads.useAdmob = true; 
    // To enabled or not iAds. 
    ads.useIads = true; 
    // Milliseconds before starting iads
    ads.iadsStartDelay = 30000; 
    // Initial top position for the iads banner
    ads.iadsTopInit = -50; 
    // Initial top position for the admob banner
    ads.admobTopInit = -50; 
    // The event's name to be fired. It's recommanded to use one per ads's instance.
    ads.iAdsShowHide = 'iAdsShowHide'; 
    // Required : your admob id
    ads.admobPublisherId = null; 
    // Date of birth, to better target the ads, new Date(1985, 10, 1, 12, 1, 1),
    ads.adDateOfBirth = '';
    // Gender 'male' or 'female'
    ads.adGender  = '';
    // Keywords about the ads to print
    ads.adKeywords = '';
    // Test mode for admob
    ads.adTesting = false;
    // admob's backgroundColor 
    ads.adBackgroundColor =  "#FDFEFD";
    // iAds's border color
    ads.iAdsBorderColor = '#FDFEFD';
    // iAds's backgroundColor
    ads.iAdsBackgroundColor = '#FDFEFD';
    // How long iAds is visible (milliseconds)
    ads.iAdsTimeToShow = 14000;
    // How long iAds is hidden (milliseconds)
    ads.iAdsTimeToHide = 30000;
    
    // init values
    ads.iAdsVisible = false;
    ads.adMobVisible = false;
    ads.admob = null;
// ----------------------------------------------------------------------------
    
// ----------------------------------------------------------------------------
    // Minimal values to init
    ads.init = function(obj,objTopPos,objHmax,typeMove) {
        ads.obj2Move = obj;
        ads.topPos = objTopPos;
        ads.objHmax = objHmax;
        ads.typeMove = typeMove;
    };
// ----------------------------------------------------------------------------
    
// ----------------------------------------------------------------------------
    ads.showiAds = function() {
        var firstRun = true;
        if (parseFloat(Titanium.Platform.version) >= 3.2) {
            Ti.API.info('ads.showiAds - build iads');
            var iads = Ti.UI.iOS.createAdView({ 
                width: Ti.UI.SIZE || 'auto',
                height: Ti.UI.SIZE || 'auto', 
                top: ads.iadsTopInit,  
                borderColor: ads.iAdsBorderColor, 
                backgroundColor: ads.iAdsBackgroundColor
            });
            iads.addEventListener('load', function(){ 
                Ti.API.info("ads.showiAds - iads loaded. First Run ? :"+firstRun);
                ads.iAdsVisible = true;
                if (firstRun) {
                    Ti.API.info("ads.showiAds - First iAds run : True");
                    iads.fireEvent(ads.iAdsShowHide);
                    firstRun = false;
                }
                else {
                    Ti.API.info("ads.showiAds - First iAds run ? : False");
                    setTimeout(function() { iads.fireEvent(ads.iAdsShowHide); Ti.API.info("ads.showiAds - iads loaded, firing iAdsShowHide to hide iAds");}, ads.iAdsTimeToShow);
                }
            });
            iads.addEventListener('error', function(e){
                Ti.API.info("ads.showiAds - iads error :"+e.message+ " --- adMobVisible="+ads.adMobVisible);
                if (ads.iAdsVisible &&  ads.typeMove != '') {
                    if (ads.adMobVisible) {
                        if (ads.typeMove === 'top') {
                            ads.obj2Move.animate({top:ads.topPos+50+ads.objMargin,duration:250}); 
                        } else {
                            ads.obj2Move.animate({height:ads.objHmax-50,duration:250}); 
                        }
                    }
                    else {
                        if (ads.typeMove === 'top') {
                            ads.obj2Move.animate({top:ads.topPos+ads.objMargin,duration:250}); 
                        } else {
                            ads.obj2Move.animate({height:ads.objHmax,duration:250}); 
                        }
                    }
                }
                ads.iAdsVisible = false;
            });
            iads.addEventListener(ads.iAdsShowHide, function(){
                Ti.API.info("ads.showiAds - Receive iAdsShowHide. ads.iAdsVisible :"+ads.iAdsVisible + " -- iads.visible: "+iads.visible+ " -- ads.adMobVisible: "+ads.adMobVisible);
                if (ads.iAdsVisible && iads.visible) {
                    if (ads.adMobVisible === false) { 
                        // if admob's not visible, it's better to let iAds on screen. Then retry after 20s
                        setTimeout(function() { iads.fireEvent(ads.iAdsShowHide); Ti.API.info("admob not visible, let iads for 20s more"); }, 20000);
                    }
                    else {
                        if (ads.typeMove != '') {
                            if (ads.typeMove === 'top') {
                                ads.obj2Move.animate({top:ads.topPos+50+ads.objMargin,duration:500}); 
                            } else {
                                ads.obj2Move.animate({height:ads.objHmax-50,duration:500}); 
                            }
                        }   
                        iads.animate({top:ads.iadsTopInit, duration:500}, function() { iads.hide(); Ti.API.info("ads.showiAds - hide iads"); });
                        // hide iAds for X s
                        setTimeout(function() { iads.fireEvent(ads.iAdsShowHide); Ti.API.info("ads.showiAds - fire iAdsShowHide to show iAds"); }, ads.iAdsTimeToHide);
                    }
                }   
                else {
                    if (ads.adMobVisible === false && ads.typeMove != '') { 
                        if (ads.typeMove === 'top') {
                            ads.obj2Move.animate({top:ads.topPos+50+ads.objMargin,duration:500}); 
                        } else {
                            ads.obj2Move.animate({height:ads.objHmax-50,duration:500}); 
                        }
                    }
                    iads.show();
                    Ti.API.info("ads.showiAds - iads show");
                    iads.animate({top:ads.topPos, duration:500});
                    setTimeout(function() { iads.fireEvent(ads.iAdsShowHide); Ti.API.info("ads.showiAds - fire iAdsShowHide to hide iAds"); }, ads.iAdsTimeToShow);
                }
            });
            Titanium.UI.currentWindow.add(iads);
        }
    };
// ----------------------------------------------------------------------------
    
// ----------------------------------------------------------------------------
    ads.buildAdmob = function() {
        if (ads.admob === null) {
            Ti.API.info("ads.buildAdmob - try buildAdmob");
            ads.admob = Ti.Admob.createView({        
                publisherId: ads.admobPublisherId, // required   
                top: ads.admobTopInit,
                left: 0,
                width: 320, // required
                height: 50, // required
                testing: ads.adTesting,
                adBackgroundColor: ads.adBackgroundColor,
                dateOfBirth: ads.adDateOfBirth, //new Date(1985, 10, 1, 12, 1, 1),
                gender: ads.adGender, //'male',
                keywords: ads.adKeywords, //'',
                refreshAd:15.0 //not working with actual ti.admob module (1.1), set refresh time within admob site
            });
            ads.admob.addEventListener('didFailToReceiveAd', function() {
                ads.admob = null;
                if (!ads.iAdsVisible && ads.typeMove != '') {
                    if (ads.typeMove === 'top') {
                        ads.obj2Move.animate({top:ads.topPos+ads.objMargin,duration:250}); 
                    } else {
                        ads.obj2Move.animate({height:ads.objHmax,duration:250}); 
                    }
                }
                ads.adMobVisible = false;
                setTimeout(ads.buildAdmob, 10000);
                Ti.API.info("ads.buildAdmob - admob error : didFailToReceiveAd. Retry in 10s. adMobVisible:"+ads.adMobVisible);
            });
            ads.admob.addEventListener('didReceiveAd', function() {
                Ti.API.info("ads.buildAdmob - admob event : didReceiveAd");
                ads.showAdmob();
            });
            Titanium.UI.currentWindow.add(ads.admob);
        }
    };
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
    ads.showAdmob = function() {
        if (ads.adMobVisible === false) {
            try {
                if (!ads.iAdsVisible && ads.typeMove != '') { 
                    if (ads.typeMove === 'top') {
                        ads.obj2Move.animate({top:ads.topPos+50+ads.objMargin,duration:500}); 
                    } else {
                        ads.obj2Move.animate({height:ads.objHmax-50,duration:500}); 
                    }
                }
                ads.adMobVisible = true;
                ads.admob.animate({top:ads.topPos,duration:500});
            }
            catch (e) {
                ads.adMobVisible = false;
                Ti.API.info("ads.showAdmob - catch admob error showAdmob");
                setTimeout(ads.buildAdmob, 10000);
            }
        }
    };
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
    ads.showAdvert = function() {
        if (Titanium.Network.online) {
            if (ads.useAdmob) { 
                Ti.Admob = require('ti.admob');
                ads.buildAdmob(); 
            }
            if (ads.useIads) { setTimeout(ads.showiAds, ads.iadsStartDelay); }  
        }
        else { // No internet connection. Retry in 30sec
            setTimeout(ads.showAdvert, 30000);  
        }
    };
// ----------------------------------------------------------------------------
    
})();

