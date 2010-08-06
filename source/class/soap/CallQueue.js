
qx.Class.define("soap.CallQueue", {extend : qx.core.Object
    ,type: "singleton"
    ,construct: function() {
        this.__queue = [];
    }
    ,destruct: function() {

    }
    ,members : {
        __queue : null
        ,add : function(call) {
            this.__queue.push(call);
        }

        ,flush : function() {
            var q = this.__queue;
            var c = q.pop();

            while(c) {
                c.callAsync();
                c=q.pop();
            }
        }
    }
});
