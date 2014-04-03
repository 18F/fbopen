import logging
import logging.handlers
import os.path
import os


class EncodingFormatter(logging.Formatter):

    def __init__(self, fmt, datefmt=None, encoding=None):
        logging.Formatter.__init__(self, fmt, datefmt)
        self.encoding = encoding

    def format(self, record):
        result = logging.Formatter.format(self, record)
        if isinstance(result, unicode):
            result = result.encode(self.encoding or 'utf-8')
        return result

def set_up_logger(name):
    if not os.getenv('FBOPEN_LOGDIR'):
        raise Exception("You must set FBOPEN_LOGDIR to the path to log to.")

    log = logging.getLogger(name)
    log.setLevel(logging.DEBUG)
    log.propagate = False
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")

    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)
    ch.setFormatter(formatter)
    log.addHandler(ch)

    fh = logging.FileHandler(os.path.join(os.getenv('FBOPEN_LOGDIR'), 'fbo_attach.log'))
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(formatter)
    log.addHandler(fh)

    # # create email handler and set level to warn
    # if settings.LOGGING_EMAIL:
    #     eh = logging.handlers.SMTPHandler(
    #         (settings.LOGGING_EMAIL['host'], settings.LOGGING_EMAIL['port']), # host
    #         settings.LOGGING_EMAIL['username'], # from address
    #         email_recipients,
    #         email_subject,
    #         (settings.LOGGING_EMAIL['username'], settings.LOGGING_EMAIL['password']) # credentials tuple
    #     )
    #     eh.setLevel(logging.WARN)
    #     eh.setFormatter(formatter)
    #     eh.setFormatter(EncodingFormatter('%(message)s', encoding='iso8859-1'))
    #     log.addHandler(eh)

    return log

