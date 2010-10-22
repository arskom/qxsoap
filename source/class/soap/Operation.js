
qx.Class.define("soap.Operation", { extend: qx.core.Object
    ,members : {
         input: null
        ,output: null
        ,service: null
    }

    ,construct: function(client) {
        this.base(arguments);
        
        this.input = new soap.MethodDefinition();
        this.output = new soap.MethodDefinition();
        this.service = client
    }
});
