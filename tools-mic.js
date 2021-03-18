const mic = require('mic')
const _ = require('lodash')

module.exports = function(RED) {
    function ToolsMicNode(config) {
        RED.nodes.createNode(this,config)
        var node = this;

        const micConfig = {
            rate: config.sampleRate,
            channels: config.channels,
            debug: false,
            exitOnSilence: 0,
            device: !_.isEmpty(config.device) ? config.device : undefined,
            endian: config.endian,
            bitwidth: _.toNumber(config.bitwidth)
        }
        
        const micInstance = mic(micConfig)

        const micInputStream = micInstance.getAudioStream();
        micInputStream.on('data', (chunk) => {
            node.send([null, {topic: 'data', payload: chunk, config: micConfig }])
        })
        micInputStream.on('pauseComplete', () => {
            node.send([{topic: 'stop', config: micConfig}, null])
        })

        var started = false
        node.on('input', function(msg) {
            if (msg.topic == 'start') {
                node.send([{topic: 'start', config: micConfig}, null])
                if (!started) {
                    micInstance.start()
                    started = true
                } else {
                    micInstance.resume()
                }
            } else if (msg.topic == 'stop') {
                micInstance.pause()
            }
        })
    }
    RED.nodes.registerType("tools-mic", ToolsMicNode)
}