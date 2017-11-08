(function () {
  "use strict";

  var applicationConfig = {
    clientID: 'e760cab2-b9a1-4c0d-86fb-ff7084abd902',
    authority: "https://login.microsoftonline.com/tfp/fabrikamb2c.onmicrosoft.com/b2c_1_susi",
    b2cScopes: ["https://fabrikamb2c.onmicrosoft.com/demoapi/demo.read"],
    webApi: 'https://fabrikamb2chello.azurewebsites.net/hello'
  };

  var logger = new Msal.Logger(loggerCallback, { level: Msal.LogLevel.Verbose });
  function loggerCallback(logLevel, message, piiEnabled) {
    console.log(message);
  }

  var clientApplication = new Msal.UserAgentApplication(applicationConfig.clientID,
    applicationConfig.authority,
    authCallback,
    {
      logger: logger,
      cacheLocation: 'localStorage'
    });

  function authCallback(errorDesc, token, error, tokenType) {
    logMessage('authCallback called. TokenType: ' + tokenType);
    if (token && tokenType === 'access_token') {
      updateUI();
      localStorage.setItem('access_token', token);
    }
    else if (token && tokenType === 'id_token') {
      login()
    }
    else {
      logMessage('authCallback: ' + error + ":" + errorDesc);
    }
  }

  function login() {
    var user = clientApplication.getUser();
    if (!user) {
      clientApplication.loginRedirect(applicationConfig.b2cScopes);
    }
    else {
      clientApplication.acquireTokenSilent(applicationConfig.b2cScopes).then(function (accessToken) {
        updateUI();
      }, function (error) {
        logMessage("Error acquireTokenSilent:\n" + error);
        clientApplication.acquireTokenRedirect(applicationConfig.b2cScopes);
      });
    }
    // clientApplication.loginPopup(applicationConfig.b2cScopes).then(function (idToken) {
    //   clientApplication.acquireTokenSilent(applicationConfig.b2cScopes).then(function (accessToken) {
    //     updateUI();
    //   }, function (error) {
    //     clientApplication.acquireTokenPopup(applicationConfig.b2cScopes).then(function (accessToken) {
    //       updateUI();
    //     }, function (error) {
    //       logMessage("Error acquiring the popup:\n" + error);
    //     });
    //   })
    // }, function (error) {
    //   logMessage("Error during login:\n" + error);
    // });
  }

  function updateUI() {
    var userName = clientApplication.getUser().name;
    logMessage("User '" + userName + "' logged-in");

    $('#label').html("Hello " + userName);

    $('#authLogin').removeClass('visible').addClass('hidden');
    $('#callApiButton').removeClass('hidden').addClass('visible');
    $('#authLogout').removeClass('hidden').addClass('visible');
  }

  function callApi() {
    clientApplication.acquireTokenSilent(applicationConfig.b2cScopes).then(function (accessToken) {
      callApiWithAccessToken(accessToken);
    }, function (error) {
      clientApplication.acquireTokenPopup(applicationConfig.b2cScopes).then(function (accessToken) {
        callApiWithAccessToken(accessToken);
      }, function (error) {
        logMessage("Error acquiring the access token to call the Web api:\n" + error);
      });
    })
  }

  function callApiWithAccessToken(accessToken) {
    // Call the Web API with the AccessToken
    $.ajax({
      type: "GET",
      url: applicationConfig.webApi,
      headers: {
        'Authorization': 'Bearer ' + accessToken,
      },
    }).done(function (data) {
      logMessage("Web APi returned:\n" + JSON.stringify(data));
    })
      .fail(function (jqXHR, textStatus) {
        logMessage("Error calling the Web api:\n" + textStatus);
      })
  }

  function logout() {
    // Removes all sessions, need to call AAD endpoint to do full logout
    clientApplication.logout();
    localStorage.clear();
    $('#authLogin').removeClass('hidden').addClass('visible');
    $('#callApiButton').removeClass('visible').addClass('hidden');
    $('#authLogout').removeClass('visible').addClass('hidden');
  }

  function logMessage(s) {
    document.body.querySelector('.response').appendChild(document.createTextNode('\n' + s));
  }

  $(document).ready(function () {
    $('#authLogin').click(function () {
      login();
    });
    $('#callApiButton').click(function () {
      callApi();
    });
    $('#authLogout').click(function(){
      logout();
    });
  });
}());