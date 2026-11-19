package clinica.inter.clinica.config;

import clinica.inter.clinica.security.TokenAuthFilter;
import clinica.inter.clinica.security.TokenService;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Segurança da API: autenticação por token (Bearer) e autorização por perfil.
 * Perfis: ADMIN (tudo), MEDICO (agenda e consultas próprias) e PACIENTE (consultas próprias).
 * Regras de "dono do dado" (ex.: paciente só agenda para si) ficam no AccessGuard.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, TokenService tokenService)
            throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable()) // API stateless com token no cabeçalho (sem cookies)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> {
                    res.setStatus(401);
                    res.setContentType("application/json;charset=UTF-8");
                    res.getWriter().write("{\"mensagem\":\"Sessão inválida ou expirada. Faça login novamente.\"}");
                })
                .accessDeniedHandler((req, res, ex) -> {
                    res.setStatus(403);
                    res.setContentType("application/json;charset=UTF-8");
                    res.getWriter().write("{\"mensagem\":\"Acesso negado: seu perfil não tem permissão para esta ação.\"}");
                }))
            .addFilterBefore(new TokenAuthFilter(tokenService), UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/error").permitAll()
                // Front-end estático servido pelo próprio Spring em http://localhost:8080
                .requestMatchers(HttpMethod.GET, "/", "/index.html", "/favicon.ico", "/*.js", "/*.css", "/*.png").permitAll()
                .requestMatchers("/auth/alterar-senha").authenticated()
                .requestMatchers("/auth/**").permitAll()

                // Cadastro geral de pessoas: somente administrador
                .requestMatchers("/pessoas/**").hasRole("ADMIN")

                // Especialidades: leitura pública (catálogo), escrita só admin
                .requestMatchers(HttpMethod.GET, "/especialidades/**").permitAll()
                .requestMatchers("/especialidades/**").hasRole("ADMIN")

                // Médicos: catálogo público (sem CPF/e-mail) para qualquer usuário logado;
                // o médico edita o próprio perfil (checado no controller); o resto é só admin
                .requestMatchers(HttpMethod.GET, "/medicos/publico").authenticated()
                .requestMatchers(HttpMethod.PUT, "/medicos/*").hasAnyRole("ADMIN", "MEDICO")
                .requestMatchers("/medicos/**").hasRole("ADMIN")

                // Pacientes: o próprio paciente vê/edita o seu cadastro (checado no controller)
                .requestMatchers(HttpMethod.GET, "/pacientes/*").hasAnyRole("ADMIN", "PACIENTE")
                .requestMatchers(HttpMethod.PUT, "/pacientes/*").hasAnyRole("ADMIN", "PACIENTE")
                .requestMatchers("/pacientes/**").hasRole("ADMIN")

                // Agenda: todos consultam; médico gerencia a própria; admin gerencia todas
                .requestMatchers(HttpMethod.GET, "/agendas/**").authenticated()
                .requestMatchers("/agendas/**").hasAnyRole("ADMIN", "MEDICO")

                // Consultas
                .requestMatchers(HttpMethod.GET, "/consultas").hasAnyRole("ADMIN", "MEDICO")
                .requestMatchers(HttpMethod.GET, "/consultas/minhas").hasAnyRole("ADMIN", "MEDICO", "PACIENTE")
                .requestMatchers(HttpMethod.POST, "/consultas").hasAnyRole("ADMIN", "PACIENTE")
                .requestMatchers(HttpMethod.PUT, "/consultas/*").hasAnyRole("ADMIN", "MEDICO", "PACIENTE")
                .requestMatchers("/consultas/**").hasRole("ADMIN")

                // Pagamentos
                .requestMatchers(HttpMethod.POST, "/pagamentos").hasAnyRole("ADMIN", "PACIENTE")
                .requestMatchers("/pagamentos/**").hasRole("ADMIN")

                // Views, procedures e functions do SQL Server
                .requestMatchers("/api/database/views/**").hasRole("ADMIN")
                .requestMatchers("/api/database/procedures/agendar").hasAnyRole("ADMIN", "PACIENTE")
                .requestMatchers("/api/database/procedures/pagar").hasAnyRole("ADMIN", "PACIENTE")
                .requestMatchers("/api/database/procedures/cancelar").hasAnyRole("ADMIN", "PACIENTE", "MEDICO")
                .requestMatchers("/api/database/functions/total-gasto-paciente/*").hasAnyRole("ADMIN", "PACIENTE")
                .requestMatchers("/api/database/functions/produtividade-medico/*").hasAnyRole("ADMIN", "MEDICO")
                .requestMatchers("/api/database/functions/consultas-periodo").hasRole("ADMIN")

                .anyRequest().authenticated()
            );
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
