import { Theme } from '@mui/material';
import React, { Component } from 'react';
import { WithTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { withStyles } from 'tss-react/mui';

import { IReduxState } from '../../../../app/types';
import { translate } from '../../../../base/i18n/functions';
import Input from '../../../../base/ui/components/web/Input';

import { getLiveStreaming } from '../functions';
import { LiveStreamingProps } from '../AbstractStreamKeyForm';

interface IProps extends WithTranslation {
    _liveStreaming: LiveStreamingProps;
    classes?: Partial<Record<keyof ReturnType<typeof styles>, string>>;
    onChange: Function;
    value: string;
}

interface IState {
    serverUrl: string;
    streamKey: string;
}

const styles = (theme: Theme) => {
    return {
        helperLink: {
            cursor: 'pointer',
            color: theme.palette.link01,
            transition: 'color .2s ease',
            ...theme.typography.labelBold,
            marginLeft: 'auto',
            marginTop: theme.spacing(1),

            '&:hover': {
                textDecoration: 'underline',
                color: theme.palette.link01Hover
            },

            '&:active': {
                color: theme.palette.link01Active
            }
        }
    };
};

/**
 * A React Component for entering RTMP server URL and stream key
 * for starting a live stream (e.g. to Telegram).
 */
class StreamKeyForm extends Component<IProps, IState> {

    /**
     * Constructor for the component.
     *
     * @inheritdoc
     */
    constructor(props: IProps) {
        super(props);

        const { serverUrl, streamKey } = this._parseRtmpUrl(props.value);

        this.state = {
            serverUrl,
            streamKey
        };

        this._onServerUrlChange = this._onServerUrlChange.bind(this);
        this._onStreamKeyChange = this._onStreamKeyChange.bind(this);
    }

    /**
     * Parses a full RTMP URL into server URL and stream key parts.
     *
     * @param {string} url - The full RTMP URL.
     * @returns {{ serverUrl: string; streamKey: string; }}
     */
    _parseRtmpUrl(url: string): { serverUrl: string; streamKey: string } {
        if (!url) {
            return { serverUrl: '', streamKey: '' };
        }

        const match = url.match(/^(rtmps?:\/\/.+\/)(.+)$/);

        if (match) {
            return { serverUrl: match[1], streamKey: match[2] };
        }

        return { serverUrl: url, streamKey: '' };
    }

    /**
     * Combines server URL and stream key into a full RTMP URL and notifies parent.
     *
     * @param {string} serverUrl - The server URL.
     * @param {string} streamKey - The stream key.
     * @returns {void}
     */
    _emitCombinedUrl(serverUrl: string, streamKey: string) {
        let combined = '';

        if (serverUrl && streamKey) {
            const normalizedUrl = serverUrl.endsWith('/') ? serverUrl : `${serverUrl}/`;

            combined = `${normalizedUrl}${streamKey}`;
        }

        this.props.onChange(combined);
    }

    /**
     * Callback for server URL input changes.
     *
     * @param {string} value - The new server URL value.
     * @returns {void}
     */
    _onServerUrlChange(value: string) {
        this.setState({ serverUrl: value });
        this._emitCombinedUrl(value, this.state.streamKey);
    }

    /**
     * Callback for stream key input changes.
     *
     * @param {string} value - The new stream key value.
     * @returns {void}
     */
    _onStreamKeyChange(value: string) {
        this.setState({ streamKey: value });
        this._emitCombinedUrl(this.state.serverUrl, value);
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    override render() {
        const { t } = this.props;
        const classes = withStyles.getClasses(this.props);

        return (
            <div className = 'stream-key-form'>
                <Input
                    autoFocus = { true }
                    id = 'stream-server-url'
                    label = { t('liveStreaming.serverUrl') }
                    name = 'serverUrl'
                    onChange = { this._onServerUrlChange }
                    placeholder = 'rtmps://dc4-1.rtmp.t.me/s/'
                    type = 'text'
                    value = { this.state.serverUrl } />
                <Input
                    id = 'stream-key-input'
                    label = { t('dialog.streamKey') }
                    name = 'streamKey'
                    onChange = { this._onStreamKeyChange }
                    placeholder = { t('liveStreaming.enterStreamKey') }
                    type = 'text'
                    value = { this.state.streamKey } />
                <div className = 'form-footer'>
                    <div className = 'help-container'>
                        { this.props._liveStreaming.helpURL
                            ? <a
                                className = { classes.helperLink }
                                href = { this.props._liveStreaming.helpURL }
                                rel = 'noopener noreferrer'
                                target = '_blank'>
                                { t('liveStreaming.streamIdHelp') }
                            </a>
                            : null
                        }
                    </div>
                </div>
            </div>
        );
    }
}

/**
 * Maps part of the Redux state to the component's props.
 *
 * @param {Object} state - The Redux state.
 * @returns {{ _liveStreaming: LiveStreamingProps }}
 */
function _mapStateToProps(state: IReduxState) {
    return {
        _liveStreaming: getLiveStreaming(state)
    };
}

export default translate(connect(_mapStateToProps)(withStyles(StreamKeyForm, styles)));
