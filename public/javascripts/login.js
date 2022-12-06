$(document).ready(()=>{
    $("#logfail").css("display", "none");

    $("#submitbtn").click((event) => {
        event.preventDefault();
        $("#emailinput").removeClass("is-invalid");
        $("#passwordinput").removeClass("is-invalid");
        let regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
       let email = $("#emailinput").val();
       let password = $("#passwordinput").val();
       let check = regex.test(email);
        if(!password){
            $("#passwordinput").addClass("is-invalid")
        }

        if(!check){
            $("#emailinput").addClass("is-invalid")
        }
       
        if (check && password){
        $("#submitbtn").prop('disabled', true);
        fetch('/login', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                'email':email,
                'password':password
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.auth){
                window.location.href = '/ide'
              }
    
            else{
            $('#logfail').css("display", "");
            $("#submitbtn").prop('disabled', false);
              }
            }
        )
    }
       
        })
    
    })