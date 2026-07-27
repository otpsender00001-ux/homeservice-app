FROM php:8.2-apache

# Burahin lahat ng MPM configuration/load files sa Apache
RUN rm -f /etc/apache2/mods-enabled/mpm_* /etc/apache2/mods-available/mpm_*

# I-enable ang mpm_prefork at rewrite modules
RUN a2enmod mpm_prefork rewrite

# Install PHP extensions para sa MySQL
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Kopyahin ang mga files ng project mo
COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html

WORKDIR /var/www/html

# I-configure ang PORT
ENV PORT=8080
RUN sed -i 's/80/${PORT}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

EXPOSE ${PORT}

# Isang malinis na command para masigurong walang lumalabas na lumang MPM
CMD ["sh", "-c", "rm -f /etc/apache2/mods-enabled/mpm_event.* /etc/apache2/mods-enabled/mpm_worker.* && apache2-foreground"]