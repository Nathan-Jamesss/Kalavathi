#include <WiFi.h>
#include <HTTPClient.h>
#include <esp_system.h>
#include "config.h"

#if !defined(CONFIG_IDF_TARGET_ESP32)
#error "Revision B uses the photographed classic ESP32. Select ESP32 Dev Module, not ESP32-C3."
#endif

// ESP32 Arduino core 3.x. No third-party libraries required.
String queuedId;
String pendingAction;
String state="idle";
unsigned long lastPoll=0,lastReconnect=0;

struct Button {
  uint8_t pin;
  bool raw=true,stable=true,armed=false;
  unsigned long changed=0;
  void begin(){pinMode(pin,INPUT_PULLUP);raw=stable=digitalRead(pin);armed=stable;}
  bool pressed(){
    bool value=digitalRead(pin);
    if(value!=raw){raw=value;changed=millis();}
    if(millis()-changed>=45&&stable!=raw){
      stable=raw;
      if(stable){armed=true;return false;}
      if(armed){armed=false;return true;}
    }
    return false;
  }
};
Button emergency{EMERGENCY_PIN},resetButton{RESET_PIN};

void lamps(bool red,bool amber,bool green){
  digitalWrite(RED_PIN,red);digitalWrite(AMBER_PIN,amber);digitalWrite(GREEN_PIN,green);
}
void beep(){
#if ENABLE_PASSIVE_PIEZO
  tone(PIEZO_PIN,2200,100);
#endif
}
int callServer(const char* method,const String& route,const String& body,String& response){
  if(WiFi.status()!=WL_CONNECTED)return -1;
  HTTPClient http;http.setConnectTimeout(700);http.setTimeout(900);
  if(!http.begin(String(SERVER_URL)+route))return -1;
  http.addHeader("X-Device-Key",DEVICE_KEY);
  int code;
  if(String(method)=="POST"){
    http.addHeader("Content-Type","application/json");code=http.POST(body);
  }else code=http.GET();
  response=code>0?http.getString():"";http.end();return code;
}
void setup(){
  Serial.begin(115200);
  emergency.begin();resetButton.begin();
  pinMode(RED_PIN,OUTPUT);pinMode(AMBER_PIN,OUTPUT);pinMode(GREEN_PIN,OUTPUT);
  lamps(true,false,false);
  WiFi.mode(WIFI_STA);WiFi.setAutoReconnect(true);WiFi.begin(WIFI_SSID,WIFI_PASSWORD);
  Serial.println("Kalavathi software-counter prototype. Keep switches released at boot.");
}
void loop(){
  // Read switches continuously. HTTP calls can briefly block; hold at least 1 s.
  bool pressed=emergency.pressed();bool resetPressed=resetButton.pressed();
  if(resetPressed){
    queuedId="";pendingAction="reset";beep();
  }else if(pressed&&pendingAction.length()==0&&queuedId.length()==0){
    if(state=="pending"||state=="granted")pendingAction="cancel";
    else{
      char id[48];snprintf(id,sizeof(id),"esp32-%08lx-%08lx-%08lx",(unsigned long)esp_random(),(unsigned long)esp_random(),(unsigned long)esp_random());
      queuedId=id;
    }
    beep();
  }
  if(WiFi.status()!=WL_CONNECTED){
    lamps((millis()/400)%2,false,false);
    if(millis()-lastReconnect>10000){lastReconnect=millis();WiFi.reconnect();}
    delay(5);return;
  }
  if(millis()-lastPoll>=750){
    lastPoll=millis();String response;int code;
    if(pendingAction.length()){
      code=callServer("POST","/api/device/"+pendingAction,"{}",response);
      if(code==200){pendingAction="";queuedId="";}
      else if(code>0)Serial.printf("Action failed: HTTP %d\n",code);
    }else if(queuedId.length()){
      code=callServer("POST","/api/device/request","{\"request_id\":\""+queuedId+"\"}",response);
      // Keep the same ID after a timeout so retries cannot consume extra allowance.
      if(code==200||code==409)queuedId="";
      else if(code>0)Serial.printf("Request failed: HTTP %d\n",code);
    }
    code=callServer("GET","/api/device/state","",response);
    if(code==200){response.trim();state=response;Serial.println("State: "+state);}
    else{state="offline";Serial.printf("State unavailable: HTTP %d\n",code);}
  }
  if(state=="granted")lamps(false,false,true);
  else if(state=="pending"||queuedId.length()||pendingAction.length())lamps(false,true,false);
  else if(state=="refused"||state=="expired")lamps(true,false,false);
  else if(state=="offline")lamps((millis()/400)%2,false,false);
  else lamps(false,false,false);
  delay(5);
}
