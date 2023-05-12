$(document).ready(()=>{
$('#regsuccess').css("display", "none");

$("#submitbtn").click((event) => {
    $("#emailinput").removeClass("is-invalid");
    $("#passwordinput").removeClass("is-invalid");
   event.preventDefault();
   let regex = /.*@bicol-u.edu.ph/i;
   let email = $("#emailinput").val();
   let password = $("#passwordinput").val();
   let check = regex.test(email);

    if(!password){
        $("#passwordinput").addClass("is-invalid")
    }

    else{
        $("#passwordinput").removeClass("is-invalid")
    }

   if (check == true && password){
    $("#submitbtn").prop('disabled', true);
    fetch('/register', {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            'email':email,
            'password':password
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data){
            $('#regsuccess').css("display", "");
            setTimeout(()=>window.location.replace("/ide"),3000);
        }

        else {
        $("#invalid-feedback-message").html("User Already Exists")
        $("#emailinput").addClass("is-invalid")
        $("#submitbtn").prop('disabled', false);
         }
     }
    )
}
   
    else{
    $("#invalid-feedback-message").html("Should be a valid Bicol University Email")
    $("#emailinput").addClass("is-invalid")
    
}})

})