const mic = require('mic')
const _ = require('lodash')
const path = require('path')
const wav = require('wav')

module.exports = function(RED) {
    function ToolsMicNode(config) {
        RED.nodes.createNode(this,config)
        var node = this;

        var micInstance = null
        var micInputStream = null
        var recording = false
        var outputFileStream = null

        const micConfig = {
            rate: config.sampleRate,
            channels: config.channels,
            debug: false,
            exitOnSilence: 0,
            device: !_.isEmpty(config.device) ? config.device : undefined,
            endian: config.endian,
            bitwidth: _.toNumber(config.bitwidth)
        }

        function prepareMicrophone(filePath) {
            micInstance = mic(micConfig)
    
            micInputStream = micInstance.getAudioStream();
            micInputStream.on('data', (chunk) => {
                node.send([null, {topic: 'data', payload: chunk, config: micConfig }])
            })

            if (filePath != null) {
                outputFileStream = new wav.FileWriter(filePath, {
                    sampleRate: micConfig.rate,
                    channels: micConfig.channels,
                    bitwidth: micConfig.bitwidth
                })
                micInputStream.pipe(outputFileStream);
            } 

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

                var filePath = config.save ? path.join(config.saveFolder, Date.now() + ".wav") : null

                prepareMicrophone(filePath)

                // handle errors in the mic stream
                micInputStream.on('error', function(err) {
                    node.error(err,msg)
                });
                
                node.send([{topic: 'start', config: micConfig, file: filePath}, null])
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