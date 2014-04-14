import logging
import logging.handlers
import os.path
import os


def set_up_logger(name, stdout=False):
    if not os.getenv('FBOPEN_LOGDIR'):
        raise Exception("You must set FBOPEN_LOGDIR to the path to log to.")

    log = logging.getLogger(name)
    log.setLevel(logging.DEBUG)
    log.propagate = False
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")

    if stdout:
        ch = logging.StreamHandler()
        ch.setLevel(logging.DEBUG)
        ch.setFormatter(formatter)
        log.addHandler(ch)
    else:
        fh = logging.FileHandler(os.path.join(os.getenv('FBOPEN_LOGDIR'), '.'.join([name.split('.')[0], 'log'])))
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
