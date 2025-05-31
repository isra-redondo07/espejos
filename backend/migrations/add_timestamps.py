from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('productos', sa.Column('created_at', sa.DateTime))
    op.add_column('productos', sa.Column('updated_at', sa.DateTime))

def downgrade():
    op.drop_column('productos', 'updated_at')
    op.drop_column('productos', 'created_at')