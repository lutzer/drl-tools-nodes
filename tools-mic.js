const mic = require('mic')
const _ = require('lodash')

module.exports = function(RED) {
    function ToolsMicNode(config) {
        RED.nodes.createNode(this,config)
        var node = this;

        var micInstance = null
        var micInputStream = null

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
                node.send([{topic: 'stop', config: micConfig}, null])
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
                micInputStream.end()
                micInputStream = null
            }
        }

        node.on('input', function(msg) {
            if (msg.topic == 'start') {
                prepareMicrophone()
                node.send([{topic: 'start', config: micConfig}, null])
                micInstance.start()
            } else if (msg.topic == 'stop') {
                micInstance.stop()
            }
        })

        node.on('close', function() {
            clearMicrophone()
        })
    }
    RED.nodes.registerType("tools-mic", ToolsMicNode)
}