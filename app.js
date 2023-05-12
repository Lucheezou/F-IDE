var createError = require('http-errors');
var express = require('express');
var bcrypt = require('bcrypt');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var request = require('request')
const session = require('express-session');
require('dotenv').config();
const sessionStore = require('connect-mongo');
var cors = require('cors');
var app = express();
const userModel = require('./models/users.js')
const brain = require('brain.js')
const data = require('./public/model/data.json');    
const fs = require("fs");
const natural = require('natural')
const network = new natural.BayesClassifier();


app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 60000 * 60
  },
  store: sessionStore.create({
      mongoUrl: process.env.CONNECT_DB,
      ttl: 14 * 24 * 60 * 60,
      autoRemove: 'native'
  })
}));



app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



//init network
let testdata = []
let trainsize = 0;
let i = 0;
let labels = [];



data.forEach((entry) => {
      if (i < 4){

            if(labels.includes(entry.output[0]) == false){      
                  labels.push(entry.output[0])
            }

            console.log(entry.input)
            console.log(entry.output)
            network.addDocument(entry.input, entry.output[0])
            trainsize++
            i++
            return
      }

      testdata.push({"input": entry.input, "output":entry.output})
      i = 0
}) 

network.train()

network.save('classifier.json', function(err, classifier) {
});

console.log("Testing Data Size : " + testdata.length)
console.log("Training Data Size : " + trainsize)
console.log("Labels : " + labels + " "  + labels.length)




const confusionmatrix = () => {
      let matrix = []
      labels.forEach((entry)=>{
      let column = labels.map((entry)=>{
            return 0
      })
            matrix.push(column)
      })

      testdata.forEach((entry) => { 
      matrix[labels.indexOf(entry.output[0])][labels.indexOf(network.classify(entry.input))] = matrix[labels.indexOf(entry.output[0])][labels.indexOf(network.classify(entry.output[0]))] + 1
      })

      console.log(matrix)
}





mongoose.connect(process.env.CONNECT_DB)
.then((data) => console.log("connection to mongosuccess"),
  err => console.log("connection to mongodb error")
)

let isAuth = (req,res,next) => {
  if(req.session.auth)
  {next();}
  else
  res.redirect('/login');
}

let isLogged = (req,res,next) =>
{
  if(req.session.auth){
    res.redirect('/ide')
  }
  else{
    next();
  }



}


app.get('/', (req,res) => {res.redirect('/index')})
app.get('/index', (req, res) => {res.redirect('https://francissoft.onrender.com')})
app.get('/ide', /*isAuth,*/ (req,res) => {res.sendFile(__dirname + '/views/ide.html')})
app.post('/ide', (req,res) => {
  let output;
  let input = {
  "clientId":"1ee0502792a5b3315f688ca84becf0de",
  "clientSecret":"62c66381fc739ba62537a9ea2c7771c14daf53077832177b3fd94e01df9bb7f3",
  "script":req.body.script,
  "language":req.body.language,
  "stdin":req.body.stdin,
  "versionIndex":"0"
};
  console.log(input)
  
  

  request({
    url: 'https://api.jdoodle.com/v1/execute',
    method: "POST",
    json: input
},
function (error, response, body) {
  
    res.send(body.output)
    console.log(body.output)
})



}
)
app.get('/login', isLogged,(req,res) => {res.sendFile(__dirname + '/views/login.html')})
app.get('/register',isLogged, (req,res) => {res.sendFile(__dirname + '/views/register.html')})
app.post('/register', async (req,res) => {

  let user = await userModel.findOne({email: req.body.email})

  if (user){
    res.send(false);
    console.log("user exists"); 
  }

  else {
    req.body.password = await bcrypt.hash(req.body.password, 15);
    user = new userModel(req.body);
    user.save().then((data) => {console.log('success register')
    res.send(true)
  },
    err => {
      res.send(err),
      console.log(err)}
    )
  }
  
  })



app.post('/login', async (req,res) => {

  let user = await userModel.findOne({email: req.body.email})

  if (user){
      bcrypt.compare(req.body.password, user.password, (err, data) => {
        if(data){
        req.session.auth = true;
        req.session.save((err, data)=> {
          if (err){
            console.log(err)
          res.send(err) 
         }
          else{
            console.log(req.session)
           res.send(req.session)
          }
      
      });
      }

      else{
       console.log(req.session)
       res.send(false)
      }


    }
    
    
    )
}

  else 
  { 
    console.log("DNE")
    res.send({DNE: true})
  }

        
}
      

)


app.get('/logout', (req, res) => {req.session.destroy()

  res.redirect("/index");

})

app.post('/helpbot', (req, res) => {

  const getquery = () => {

  let output = network.classify(req.body.input)
  
  switch(output){

    case "round":
      console.log("model output : "+ output)
      output = "The round() function in C++ returns the integral value that is nearest to the argument, with halfway cases rounded away from zero. It is defined in the cmath header file. Example: #include &ltiostream&gt using namespace std; int main() { int num; cout &lt&lt \"Enter a number: \"; // take integer input cin &gt&gt num; cout &lt&lt \"You entered: \" &lt&lt num; return 0; }"
      break;
    case "exp":
      console.log("model output : "+ output)
      output = " The exp() function in C++ returns the exponential (Euler's number) e raised to the given argument. This function is defined in &ltcmath&gt header file. Example: #include &ltiostream&gt #include &ltcmath&gt using namespace std; int main() { long int x = 13; double result; result = exp(x); cout &lt&lt \"exp(x) = \" &lt&lt result &lt&lt endl; return 0; } "
      break;
    
    case "sqrt":
      console.log("model output : "+ output)
      output = "The sqrt() function in C++ returns the square root of a number. This function is defined in the cmath header file. Example: #include &ltiostream&gt #include &ltcmath&gt using namespace std; int main() { cout &lt&lt \"Square root of 25 = \"; // print the square root of 25 cout &lt&lt sqrt(25); return 0; } "
      break;
    
    case "atol":
      console.log("model output : "+ output)
      output = "The atol() function in C++ interprets the contents of a string and returns its corresponding integer value. It is defined in &ltcstdlib&gt header file. Example: #include &ltiostream&gt #include &ltcstdlib&gt using namespace std; int main() { char s[] = \"-114\"; double number; cout &lt&lt\"Number in String = \" &lt&lt s &lt&lt endl; number = atol(s); cout &lt&lt \"Number in Long Int = \" &lt&lt number; return 0; }"
      break;

    case "strtod":
      console.log("model output : "+ output)
      output = "The strtod() function in C++ interprets the contents of a string as a floating point number and return its value as a double. This function also sets a pointer to point to the first character after the last valid character of the string if there is any, otherwise the pointer is set to null. For base 10 and the string \"12abc\" Valid numeric part -&gt 12 First character after valid numeric part -&gt a It is defined in &ltcstdlib&gt header file. Example: #include &ltiostream&gt #include &ltcstdlib&gt using namespace std; int main() { char numberString[] = \"12.44b 0xy\"; char *end; double number; number = strtod(numberString,&end); cout &lt&lt \"Number in String = \" &lt&lt numberString &lt&lt endl; cout &lt&lt \"Number in Double = \" &lt&lt number &lt&lt endl; cout &lt&lt \"End String = \" &lt&lt end &lt&lt endl; return 0; }"
      break;

    case "strtol":
      console.log("model output : "+ output)
      output = "The strtol() function in C++ interprets the contents of a string as an integral number of the specified base and return its value as a long int. The strtol() function in C++ interprets the contents of a string as an integral number of the specified base and return its value as a long int. This function also sets a pointer to point to the first character after the last valid character of the string if there is any, otherwise the pointer is set to null. The strtol() function takes string, a pointer to character and an integer value - base as its parameter, interprets the content of string as an integral number of the given base and returns a long int value. This function is defined in &ltcstdlib&gt header file. Example:  #include &ltiostream&gt #include &ltcstdlib&gt using namespace std; int main() { int base = 10; char str[] = \"27ab_1x\"; char *end; long int num; num = strtol(str, &end, base); cout &lt&lt \"Number in String = \" &lt&lt str &lt&lt endl; cout &lt&lt \"Number in Long Int = \" &lt&lt num &lt&lt endl; cout &lt&lt \"End String = \" &lt&lt end &lt&lt endl &lt&lt endl; // the pointer to invalid characters can be null strcpy(str, \"27\"); cout &lt&lt \"Number in String = \" &lt&lt str &lt&lt endl; num = strtol(str, &end, base); cout &lt&lt \"Number in Long Int = \" &lt&lt num &lt&lt endl; if (*end) { cout &lt&lt end; } else { cout &lt&lt \"Null pointer\"; } return 0; }"
      break;

    case "atof":
          console.log("model output : "+ output)
          output = "The atof() function in C++ interprets the contents of a string as a floating point number and return its value as a double. It is defined in &ltcstdlib&gt header file. Example: #include &ltiostream&gt #include &ltcstdlib&gt using namespace std; int main() { char numberString[] = \"-32.40\"; double numberInDouble; cout &lt&lt \"Number in String = \" &lt&lt numberString &lt&lt endl; numberInDouble = atof(numberString); cout &lt&lt \"Number in Double = \" &lt&lt numberInDouble; return 0; }"
          break;

    case "malloc":
          console.log("model output : "+ output)
          output = "The malloc() function in C++ allocates a block of uninitialized memory to a pointer. It is defined in the cstdlib header file. Example: #include &ltiostream&gt #include &ltcstdlib&gt using namespace std; int main() { // allocate memory of int size to an int pointer int* ptr = (int*) malloc(sizeof(int)); // assign the value 5 to allocated memory *ptr = 5; cout &lt&lt *ptr; return 0; }"
          break;

    case "srand":
          console.log("model output : "+ output)
          output = "The srand() function in C++ seeds the pseudo-random number generator used by the rand() function. It is defined in the cstdlib header file. Example: #include&ltiostream&gt #include&ltcstdlib&gt using namespace std; int main() { // set seed to 10 srand(10); // generate random number int random = rand(); cout &lt&lt random; return 0; }"
          break;    
          
    case "strcat":
          console.log("model output : "+ output)
          output = "The strcat() function in C++ appends a copy of a string to the end of another string. strcat() prototype char* strcat( char* dest, const char* src ); The strcat() function takes two arguments: dest and src. This function appends a copy of the character string pointed to by src to the end of string pointed to by dest. The null terminating character at the end of dest is replaced by the first character of src and the resulting character is also null terminated. The behaviour is undefined if - the strings overlap. - the dest array is not large enough to append the contents of src. It is defined in &ltcstring&gt header file. Example: #include &ltcstring&gt #include &ltiostream&gt using namespace std; int main() { char dest[50] = \"Learning C++ is fun\"; char src[50] = \" and easy\"; strcat(dest, src); cout &lt&lt dest ; return 0; }"
          break;   
    
     case "printf":
          console.log("model output : "+ output)
          output = "The printf() function in C++ is used to write a formatted string to the standard output (stdout). It is defined in the cstdio header file. Example: #include &ltcstdio&gt int main() { int age = 23; // print a string literal printf(\"My age is \"); // print an int variable printf(\"%d\", age); return 0; }"
          break;   

    case "scanf":
          console.log("model output : "+ output)
          output = "The scanf() function in C++ is used to read the data from the standard input (stdin). The read data is stored in the respective variables.It is defined in the cstdio header file. Example: #include &ltcstdio&gt #include &ltiostream&gt using namespace std; int main() { int age; cout &lt&lt \"Enter your age: \"; // get age from user scanf(\"%d\", &age); // print age cout &lt&lt \"Age = \" &lt&lt age; return 0; }"
          break;  
    
    case "fopen":
          console.log("model output : "+ output)
          output = "The fopen() function in C++ opens a specified file in a certain mode. Example: #include &ltcstdio&gt #include &ltcstring&gt using namespace std; int main() { int c; FILE *fp; fp = fopen(\"file.txt", "w\"); char str[20] = \"Hello World!\"; if (fp) { for(int i=0; i&ltstrlen(str); i++) putc(str[i],fp); } fclose(fp); }"
          break;
    
    case "fclose":
          console.log("model output : "+ output)
          output = "The fclose() function takes a single argument, a file stream which is to be closed. All the data that are buffered but not written are flushed to the OS and all unread buffered data are discarded.Even if the operation fails, the stream is no longer associated with the file. If the file pointer is used after fclose() is executed, the behaviour is undefined.It is defined in &ltcstdio&gt header file. Example: #include &ltiostream&gt #include &ltcstdio&gt using namespace std; int main() { FILE *fp; fp = fopen(\"file.txt","w\"); char str[20] = \"Hello World!\"; if (fp == NULL) { cout &lt&lt \"Error opening file\"; exit(1); } fprintf(fp,\"%s\",str); fclose(fp); cout &lt&lt \"File closed successfully\"; return 0; }"
          break;  

    case "fputs":
          console.log("model output : "+ output)
          output = "The fputs() function in C++ writes a string completely except the terminating null character to the given output file stream.It is same as executing fputc() repeatedly. Example: #include &ltcstdio&gt int main() { char str[] = \"Learning to program\"; FILE *fp; fp = fopen(\"file.txt","w\"); if (fp) fputs(str,fp); else perror(\"File opening failed\"); fclose(fp); return 0; }"
          break;  
    
    case "getchar":
          console.log("model output : "+ output)
          output = "The getchar() function in C++ reads the next character from stdin. Example: #include &ltiostream&gt #include &ltcstdio&gt using namespace std; int main() { int c,i=0; char str[100]; cout &lt&lt \"Enter characters, Press Enter to stop\n\"; do { c = getchar(); str[i] = c; i++; } while(c!='\n'); cout &lt&lt str; return 0; }"
          break;  
    
    case "fread":
          console.log("model output : "+ output)
          output = "The fread() function in C++ reads a specified number of characters from the given input stream. Example: #include &ltiostream&gt #include &ltcstdio&gt using namespace std; int main() { FILE *fp; char buffer[100]; fp = fopen(\"data.txt","rb\"); while(!feof(fp)) { fread(buffer,sizeof(buffer),1,fp); cout &lt&lt buffer; } return 0; }"
          break;  
    
    case "fwrite":
          console.log("model output : "+ output)
          output = "The fwrite() function in C++ writes a specified number of characters to the given output stream. Example: #include &ltiostream&gt #include &ltcstdio&gt using namespace std; int main() { int retVal; FILE *fp; char buffer[] = \"Writing to a file using fwrite.\"; fp = fopen(\"data.txt","w\"); retVal = fwrite(buffer,sizeof(buffer),1,fp); cout &lt&lt \"fwrite returned \" &lt&lt retVal; return 0; }"
          break;  
    
    case "strcat":
          console.log("model output : "+ output)
          output = "The strcat() function in C++ appends a copy of a string to the end of another string. strcat() prototype char* strcat( char* dest, const char* src ); The strcat() function takes two arguments: dest and src. This function appends a copy of the character string pointed to by src to the end of string pointed to by dest. The null terminating character at the end of dest is replaced by the first character of src and the resulting character is also null terminated. The behaviour is undefined if - the strings overlap. - the dest array is not large enough to append the contents of src. It is defined in &ltcstring&gt header file. Example: #include &ltcstring&gt #include &ltiostream&gt using namespace std; int main() { char dest[50] = \"Learning C++ is fun\"; char src[50] = \" and easy\"; strcat(dest, src); cout &lt&lt dest ; return 0; }"
          break;  
    
    case "fopen":
          console.log("model output : "+ output)
          output = "The fopen() function in C++ opens a specified file in a certain mode. Example: #include &ltcstdio&gt #include &ltcstring&gt using namespace std; int main() { int c; FILE *fp; fp = fopen(\"file.txt", "w\"); char str[20] = \"Hello World!\"; if (fp) { for(int i=0; i&ltstrlen(str); i++) putc(str[i],fp); } fclose(fp); }"
          break;  
 
    case "cin":
          console.log("model output : "+ output)
          output = "The cin() object is used to accept input from the standard input device i.e. keyboard. It is defined in the iostream header file. Example: #include &ltiostream&gt using namespace std; int main() { int num; cout &lt&lt \"Enter a number: \"; // take integer input cin &gt&gt num; cout &lt&lt \"You entered: \" &lt&lt num; return 0; }"
          break;  
   
    case "cout":
          console.log("model output : "+ output)
          output = "The cout() object is used to display the output to the standard output device. It is defined in the iostream header file. Example: #include &ltiostream&gt using namespace std; int main() { int a = 24; // print variable cout &lt&lt \"Value of a is \" &lt&lt a; return 0; }"
          break;  
 
    case "strncpy":
          console.log("model output : "+ output)
          output = "The strncpy() function in C++ copies a specified bytes of characters from source to destination. Example: #include &ltcstring&gt #include &ltiostream&gt using namespace std; int main() { char src[] = \"It's Monday and it's raining\"; char dest[40]; /* count less than length of src */ strncpy(dest,src,10); cout &lt&lt dest &lt&lt endl; /* count more than length of src */ strncpy(dest,src,strlen(src)+10); cout &lt&lt dest &lt&lt endl; return 0; }"
          break;  

    case "strcmp":
          console.log("model output : "+ output)
          output = "The strcmp() function in C++ compares two null-terminating strings (C-strings). The comparison is done lexicographically. It is defined in the cstring header file. Example: #include &ltcstring&gt #include &ltiostream&gt using namespace std; int main() { char src[] = \"It's Monday and it's raining\"; char dest[40]; /* count less than length of src */ strncpy(dest,src,10); cout &lt&lt dest &lt&lt endl; /* count more than length of src */ strncpy(dest,src,strlen(src)+10); cout &lt&lt dest &lt&lt endl; return 0; }"
          break;  
    
    case "strlen":
          console.log("model output : "+ output)
          output = "The strlen() function in C++ returns the length of the given C-string. It is defined in the cstring header file. Example: #include &ltiostream&gt #include &ltcstring&gt using namespace std; int main() { // initialize C-string char song[] = \"We Will Rock You!\"; // print the length of the song string cout &lt&lt strlen(song); return 0; }"
          break;  
    
    case "isalpha":
          console.log("model output : "+ output)
          output = "The isalpha() function in C++ checks if the given character is an alphabet or not. It is defined in the cctype header file. Example: #include &ltiostream&gt #include &ltcctype&gt using namespace std; int main() { // check if '27' is an alphabet int result = isalpha('27'); cout &lt&lt result; return 0; }"
          break;  
    
    case "isdigit":
          console.log("model output : "+ output)
          output = "The isdigit() function in C++ checks if the given character is a digit or not. It is defined in the cctype header file. Example: #include &ltiostream&gt using namespace std; int main() { // checks if '9' is a digit cout &lt&lt isdigit('9'); return 0; }"
          break;  
      
    case "isblank":
          console.log("model output : "+ output)
          output = "The isblank() function checks if ch is a blank character or not as classified by the currently installed C locale. By default, space and horizontal tab are considered as blank characters. Example: #include &ltcctype&gt #include &ltiostream&gt #include &ltcstring&gt using namespace std; int main() { char str[] = \"Hello, I am here.\"; int count = 0; for (int i=0; i&lt=strlen(str); i++) { if (isblank(str[i])) count ++; } cout &lt&lt \"Number of blank characters: \" &lt&lt count &lt&lt endl; return 0; }"
          break;  
    
    case "tolower":
          console.log("model output : "+ output)
          output = "The tolower() function in C++ converts a given character to lowercase. It is defined in the cctype header file. Example: #include &ltiostream&gt #include &ltcctype&gt using namespace std; int main() { // convert 'A' to lowercase char ch = tolower('A'); cout &lt&lt ch; return 0; }"
          break;  
    
    case "toupper":
          console.log("model output : "+ output)
          output = "The toupper() function in C++ converts a given character to uppercase. It is defined in the cctype header file. Example: #include &ltiostream&gt #include &ltcctype&gt using namespace std; int main() { // convert 'a' to uppercase char ch = toupper('a'); cout &lt&lt ch; return 0; }"
          break;  
     
    case "fopen":
          console.log("model output : "+ output)
          output = "The fopen() function in C++ opens a specified file in a certain mode. Example: #include &ltcstdio&gt #include &ltcstring&gt using namespace std; int main() { int c; FILE *fp; fp = fopen(\"file.txt", "w\"); char str[20] = \"Hello World!\"; if (fp) { for(int i=0; i&ltstrlen(str); i++) putc(str[i],fp); } fclose(fp); }"
          break;  
     
    case "fopen":
          console.log("model output : "+ output)
          output = "The fopen() function in C++ opens a specified file in a certain mode. Example: #include &ltcstdio&gt #include &ltcstring&gt using namespace std; int main() { int c; FILE *fp; fp = fopen(\"file.txt", "w\"); char str[20] = \"Hello World!\"; if (fp) { for(int i=0; i&ltstrlen(str); i++) putc(str[i],fp); } fclose(fp); }"
          break;  
    
    case "fopen":
          console.log("model output : "+ output)
          output = "The fopen() function in C++ opens a specified file in a certain mode. Example: #include &ltcstdio&gt #include &ltcstring&gt using namespace std; int main() { int c; FILE *fp; fp = fopen(\"file.txt", "w\"); char str[20] = \"Hello World!\"; if (fp) { for(int i=0; i&ltstrlen(str); i++) putc(str[i],fp); } fclose(fp); }"
          break;  
     
    case "fopen":
          console.log("model output : "+ output)
          output = "The fopen() function in C++ opens a specified file in a certain mode. Example: #include &ltcstdio&gt #include &ltcstring&gt using namespace std; int main() { int c; FILE *fp; fp = fopen(\"file.txt", "w\"); char str[20] = \"Hello World!\"; if (fp) { for(int i=0; i&ltstrlen(str); i++) putc(str[i],fp); } fclose(fp); }"
          break;  

    case "fopen":
          console.log("model output : "+ output)
          output = "The fopen() function in C++ opens a specified file in a certain mode. Example: #include &ltcstdio&gt #include &ltcstring&gt using namespace std; int main() { int c; FILE *fp; fp = fopen(\"file.txt", "w\"); char str[20] = \"Hello World!\"; if (fp) { for(int i=0; i&ltstrlen(str); i++) putc(str[i],fp); } fclose(fp); }"
          break;  

    case "fopen":
          console.log("model output : "+ output)
          output = "The fopen() function in C++ opens a specified file in a certain mode. Example: #include &ltcstdio&gt #include &ltcstring&gt using namespace std; int main() { int c; FILE *fp; fp = fopen(\"file.txt", "w\"); char str[20] = \"Hello World!\"; if (fp) { for(int i=0; i&ltstrlen(str); i++) putc(str[i],fp); } fclose(fp); }"
          break;  

    case "fopen":
          console.log("model output : "+ output)
          output = "The fopen() function in C++ opens a specified file in a certain mode. Example: #include &ltcstdio&gt #include &ltcstring&gt using namespace std; int main() { int c; FILE *fp; fp = fopen(\"file.txt", "w\"); char str[20] = \"Hello World!\"; if (fp) { for(int i=0; i&ltstrlen(str); i++) putc(str[i],fp); } fclose(fp); }"
          break;  

    case "fopen":
          console.log("model output : "+ output)
          output = "The fopen() function in C++ opens a specified file in a certain mode. Example: #include &ltcstdio&gt #include &ltcstring&gt using namespace std; int main() { int c; FILE *fp; fp = fopen(\"file.txt", "w\"); char str[20] = \"Hello World!\"; if (fp) { for(int i=0; i&ltstrlen(str); i++) putc(str[i],fp); } fclose(fp); }"
          break;  


    default: 
      console.log(output)
      output = "I did not understand"
      break;
    }
    return output
  }

  const output = getquery();
  console.log("Input: " + req.body.input);
  console.log("Output: " + output);
  res.send(output);
  
})

app.use((req,res)=>{res.send('404 not found hehe')});


// catch 404 and forward to error handler

module.exports = app;
