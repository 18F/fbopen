from flask.ext.wtf import Form
from wtforms import StringField, BooleanField, SelectField
from wtforms.validators import DataRequired

class SearchForm(Form):
    search = StringField('search')

class AdvancedSearchForm(Form):
    search = StringField('search')
    show_closed = BooleanField('show_closed', default = False)
    show_noncompeted = BooleanField('show_noncompeted', default = False)
    data_source = SelectField(
        'Data Source: ',
        choices=[
                ('', 'All'),
                ('FBO', 'FedBizOpps (fbo.gov)'),
                ('grants.gov', 'grants.gov')],
        default = '')
    
