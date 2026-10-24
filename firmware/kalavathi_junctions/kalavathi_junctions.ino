// Arduino Uno R3. Each LED has its own confirmed 330-ohm or 1k resistor.
// Order within each group: red, amber, green. LED cathodes go to GND.
const byte pins[4][3]={{2,3,4},{5,6,7},{8,9,10},{11,12,13}};
char line[16];byte length=0;bool overflow=false;
unsigned long lastCommand=0;

void allRed(){
  for(byte j=0;j<4;j++)for(byte c=0;c<3;c++)digitalWrite(pins[j][c],c==0?HIGH:LOW);
}
void applyLine(){
  if(overflow||length!=7){allRed();return;}
  byte greens=0;
  for(byte j=0;j<4;j++){
    char c=line[j*2];
    if(c!='R'&&c!='A'&&c!='G'){allRed();return;}
    if(c=='G')greens++;
    if(j<3&&line[j*2+1]!=' '){allRed();return;}
  }
  if(greens>1){allRed();return;}
  // Turn every green off before applying the new state.
  for(byte j=0;j<4;j++)for(byte c=0;c<3;c++)digitalWrite(pins[j][c],LOW);
  for(byte j=0;j<4;j++){
    byte colour=line[j*2]=='R'?0:line[j*2]=='A'?1:2;
    digitalWrite(pins[j][colour],HIGH);
  }
  lastCommand=millis();
}
void setup(){
  for(byte j=0;j<4;j++)for(byte c=0;c<3;c++)pinMode(pins[j][c],OUTPUT);
  allRed();Serial.begin(115200);
}
void loop(){
  while(Serial.available()){
    char c=Serial.read();
    if(c=='\n'){applyLine();length=0;overflow=false;}
    else if(c!='\r'){if(length<sizeof(line)-1)line[length++]=c;else overflow=true;}
  }
  // Laptop, bridge or cable failure: no command for 3 seconds means all red.
  if(millis()-lastCommand>3000)allRed();
}
