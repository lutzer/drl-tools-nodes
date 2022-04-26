const mic = require('mic')
const _ = require('lodash')

module.exports = function(RED) {
    function ToolsMicNode(config) {
        RED.nodes.createNode(this,config)
        var node = this;

        var micInstance = null
        var micInputStream = null
        var recording = false

        const micConfig = {
            rate: config.sampleRate,
            channels: config.channels,
            debug: false,
            exitOnSilence: 0,
            device: !_.isEmpty(config.device) ? config.device : undefined,
            endian: config.endian,
            bitwidth: _.toNumber(config.bitwidth)
        }

        function prepareMicrophone() {
            micInstance = mic(micConfig)
    
            micInputStream = micInstance.getAudioStream();
            micInputStream.on('data', (chunk) => {
                node.send([null, {topic: 'data', payload: chunk, config: micConfig }])
            })
            micInputStream.on('stopComplete', () => {
                recording = false
                node.send([{topic: 'stop', config: micConfig}, null])
                node.status({})
                clearMicrophone()
            })
        }

        function clearMicrophone() {
            if (micInstance) {
                micInstance.stop()
                micInstance = null
            }
            if (micInputStream) {
                micInputStream.removeAllListeners()
                micInputStream = null
            }
        }

        node.on('input', function(msg) {
            if (msg.payload == 'start') {
                if (recording) {
                    node.error("mic is still recording", msg)
                    return
                }
                prepareMicrophone()

                // handle errors in the mic stream
                micInputStream.on('error', function(err) {
                    node.error(err,msg)
                });
                
                node.send([{topic: 'start', config: micConfig}, null])
                micInstance.start()
                recording = true
                node.status({fill:"red",shape:"ring",text:"recording"})
            } else if (msg.payload == 'stop') {
                if (micInstance)
                    micInstance.stop()
                else
                    recording == false
            }
        })

        node.on('close', function() {
            clearMicrophone()
        })
    }
    RED.nodes.registerType("tools-mic", ToolsMicNode)
}